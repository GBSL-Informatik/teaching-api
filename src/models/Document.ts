import { type JsonObject } from '@prisma/client/runtime/client';
import { Access, Document as DbDocument, Prisma, PrismaClient, User } from '../../prisma/generated/client.js';
import { highestAccess, NoneAccess, RWAccess } from '../helpers/accessPolicy.js';
import prisma from '../prisma.js';
import { HTTP403Error, HTTP404Error } from '../utils/errors/Errors.js';
import Logger from '../utils/logger.js';
import DocumentRoot, { AccessCheckableDocumentRoot } from './DocumentRoot.js';
import { ApiGroupPermission } from './RootGroupPermission.js';
import { ApiUserPermission } from './RootUserPermission.js';
import { hasElevatedAccess, Role, whereStudentGroupAccess } from './User.js';

type AccessCheckableDocument = DbDocument & { documentRoot: AccessCheckableDocumentRoot };

export type ApiDocument = Omit<DbDocument, 'uniqOnRoot' | 'uniqOnParent' | 'parentId'> &
    Partial<Pick<DbDocument, 'uniqOnRoot' | 'uniqOnParent' | 'parentId'>>;

interface DocumentWithPermission {
    document: ApiDocument;
    highestPermission: Access;
}

export interface UniquenessConstraints {
    uniqOnRoot?: string | null;
    uniqOnParent?: string | null;
}

const extractPermission = (actorId: string, document: AccessCheckableDocument): Access | null => {
    const hasBaseAccess =
        document.authorId === actorId || !NoneAccess.has(document.documentRoot.sharedAccess);
    if (!hasBaseAccess) {
        return null;
    }

    const permissions = new Set([
        document.documentRoot.access,
        ...document.documentRoot.rootGroupPermissions.map((p) => p.access),
        ...document.documentRoot.rootUserPermissions.map((p) => p.access)
    ]);
    const usersPermission = highestAccess(permissions);
    if (document.authorId === actorId) {
        return usersPermission;
    }

    return highestAccess(new Set([document.documentRoot.sharedAccess]), usersPermission);
};

export const cleanupDocument = (doc: ApiDocument) => {
    if (!doc?.uniqOnParent) {
        delete (doc as any).uniqOnParent;
    }
    if (!doc?.uniqOnRoot) {
        delete (doc as any).uniqOnRoot;
    }
    if (!doc?.parentId) {
        delete (doc as any).parentId;
    }
    if ((doc as Partial<AccessCheckableDocument>).documentRoot) {
        delete (doc as Partial<AccessCheckableDocument>).documentRoot;
    }
    return doc;
};

export const prepareDocument = (actorId: string, document: AccessCheckableDocument | null) => {
    if (!document) {
        return null;
    }
    const permission = extractPermission(actorId, document);
    if (!permission) {
        return null;
    }
    const model: ApiDocument = cleanupDocument({ ...document });
    if (NoneAccess.has(permission)) {
        model.data = null;
    }
    return { document: model, highestPermission: permission };
};

type Response<T> = {
    model: T;
    exists?: boolean; // wheter the model already existed and was returned instead of created
    permissions: {
        access: Access;
        sharedAccess: Access;
        group: ApiGroupPermission[];
        user: ApiUserPermission[];
    };
};

function Document(db: PrismaClient['document']) {
    return Object.assign(db, {
        async findModel(actor: User, id: string): Promise<DocumentWithPermission | null> {
            return db
                .findUnique({
                    where: { id: id },
                    include: {
                        documentRoot: {
                            include: {
                                rootGroupPermissions: {
                                    where: { studentGroup: { users: { some: { userId: actor.id } } } }
                                },
                                rootUserPermissions: { where: { user: actor } }
                            }
                        }
                    }
                })
                .then((doc) => prepareDocument(actor.id, doc));
        },
        async createModel(
            actor: User,
            type: string,
            documentRootId: string,
            data: any,
            parentId?: string,
            uniqOnRoot?: string | null,
            uniqOnParent?: string | null,
            _onBehalfOfUserId?: string /** this flag enables creation of documents on behalf of another user */
        ): Promise<Response<ApiDocument>> {
            const documentRoot = await DocumentRoot.findModel(actor, documentRootId);
            if (!documentRoot) {
                throw new HTTP404Error('Document root not found');
            }
            const elevatedAccess = hasElevatedAccess(actor.role);
            const onBehalfOf = !!_onBehalfOfUserId && elevatedAccess;
            const authorId = onBehalfOf ? _onBehalfOfUserId : actor.id;
            if (onBehalfOf && _onBehalfOfUserId !== actor.id) {
                const onBehalfOfUser = await prisma.user.findUnique({
                    where:
                        actor.role === Role.ADMIN
                            ? { id: _onBehalfOfUserId }
                            : { id: _onBehalfOfUserId, ...whereStudentGroupAccess(actor.id, true) }
                });
                if (!onBehalfOfUser) {
                    throw new HTTP404Error('On Behalf Of user not found or no required access');
                }
                Logger.info(`🔑 On Behalf Of: ${_onBehalfOfUserId}`);
            }
            if (parentId) {
                const parent = await this.findModel(actor, parentId);
                if (!parent) {
                    throw new HTTP404Error('Parent document not found');
                }
                /**
                 * TODO: Should we allow creating children on documents where actor only has RO access?
                 */
                if (!(
                    parent.document.authorId === actor.id ||
                    elevatedAccess ||
                    RWAccess.has(parent.highestPermission)
                )) {
                    throw new HTTP403Error('Insufficient access permission');
                }
            }
            const model:
                | { exists: true }
                | {
                      exists: false;
                      model: {
                          document: ApiDocument;
                          highestPermission: Access;
                      };
                  } = await prisma.$transaction(async (tx) => {
                // TODO: Remove this once the unique main check is distributed and applied on the database level.
                if (uniqOnRoot === 'main') {
                    const mainDocs = await tx.document.findMany({
                        where: {
                            documentRootId: documentRootId,
                            authorId: authorId,
                            OR: [{ uniqOnRoot: 'main' }, { uniqOnRoot: null }],
                            parentId: null,
                            type: type
                        },
                        orderBy: { createdAt: 'asc' }
                    });
                    if (mainDocs.length > 0) {
                        const enforcedMain = mainDocs.find((doc) => doc.uniqOnRoot === 'main') ?? mainDocs[0];
                        // heuristic: use the doc with the biggest data size and delete the rest
                        let data = enforcedMain.data;
                        for (const doc of mainDocs) {
                            if (doc.data && JSON.stringify(doc.data).length > JSON.stringify(data).length) {
                                data = doc.data;
                            }
                        }
                        if (data !== enforcedMain.data || enforcedMain.uniqOnRoot !== 'main') {
                            await tx.document.update({
                                where: { id: enforcedMain.id },
                                data: {
                                    data: data!,
                                    uniqOnRoot: 'main'
                                }
                            });
                        }
                        if (mainDocs.length > 1) {
                            // attach all others mainDocs children to the enforced main document and delete the rest
                            await tx.document.updateMany({
                                where: {
                                    parentId: {
                                        in: mainDocs
                                            .map((doc) => doc.id)
                                            .filter((id) => id !== enforcedMain.id)
                                    },
                                    uniqOnParent: null // delete children having a uniqOnParent constraint - we don't want to risk overwriting a child with a unique constraint
                                },
                                data: { parentId: enforcedMain.id }
                            });
                            await tx.document.deleteMany({
                                where: {
                                    id: {
                                        in: mainDocs
                                            .filter((doc) => doc.id !== enforcedMain.id)
                                            .map((doc) => doc.id)
                                    }
                                }
                            });
                        }
                        return { exists: true };
                    }
                }
                /**
                 * Since it is easyier to check wheter a user has permissions to create a model
                 * when the model actually exists, we create the model first and then check the permissions.
                 */
                const model = await tx.document
                    .create({
                        data: {
                            type: type,
                            documentRootId: documentRootId,
                            data: data,
                            parentId: parentId,
                            authorId: authorId,
                            uniqOnRoot: uniqOnRoot,
                            uniqOnParent: uniqOnParent
                        },
                        include: {
                            documentRoot: {
                                include: {
                                    rootGroupPermissions: {
                                        where: { studentGroup: { users: { some: { userId: authorId } } } }
                                    },
                                    rootUserPermissions: { where: { user: { id: authorId } } }
                                }
                            }
                        }
                    })
                    .then((doc) => prepareDocument(authorId, doc)!);
                /**
                 * Check if the user has the required permissions to create the model.
                 * If not, delete the model and throw an error.
                 */
                const canCreate = RWAccess.has(model.highestPermission);
                if (!canCreate && !onBehalfOf) {
                    Logger.info(`❌ New Model [${model.document.id}]: ${model.highestPermission}`);
                    throw new HTTP403Error('Insufficient access permission');
                }
                return { exists: false, model: model };
            });
            if (model.exists) {
                // throw new prisma P2002 error to indicate that the model already exists and was not created
                throw new Prisma.PrismaClientKnownRequestError('Unique constraint failed on main document', {
                    code: 'P2002',
                    clientVersion: Prisma.prismaVersion.client,
                    meta: {
                        target: ['uniqOnRoot']
                    }
                });
            }
            return {
                model: model.model.document,
                permissions: {
                    access: documentRoot.access,
                    sharedAccess: documentRoot.sharedAccess,
                    group: documentRoot.groupPermissions,
                    user: documentRoot.userPermissions
                }
            };
        },

        async updateModel(
            actor: User,
            id: string,
            docData: JsonObject,
            _onBehalfOf = false /** this flag enables the modification of documents on behalf of another user */
        ) {
            const elevatedAccess = hasElevatedAccess(actor.role);
            const onBehalfOf = _onBehalfOf && elevatedAccess;
            if (onBehalfOf) {
                /**
                 * ensure the document exists
                 */
                const record = await db.findUnique({
                    where:
                        actor.role === Role.ADMIN
                            ? { id }
                            : { id: id, author: whereStudentGroupAccess(actor.id, true) }
                });
                if (!record) {
                    throw new HTTP404Error('Document not found');
                }
            } else {
                const record = await this.findModel(actor, id);
                if (!record) {
                    throw new HTTP404Error('Document not found');
                }
                /**
                 * models can be updated when the user has RW access
                 */
                const canWrite = RWAccess.has(record.highestPermission);
                if (!canWrite && !onBehalfOf) {
                    throw new HTTP403Error('Not authorized');
                }
            }
            /**
             * only the data field is allowed to be updated
             */
            const model = (await db.update({
                where: { id: id },
                data: { data: docData },
                include: {
                    documentRoot: {
                        include: {
                            rootGroupPermissions: { select: { access: true, studentGroupId: true } },
                            rootUserPermissions: { select: { access: true, userId: true } }
                        }
                    }
                }
            })) satisfies DbDocument;
            return model;
        },

        async deleteModel(actor: User, id: string) {
            const record = await this.findModel(actor, id);
            if (!record) {
                throw new HTTP404Error('Document not found');
            }
            /**
             * models can be deleted when the actor is the author and has RW access.
             */
            const canDelete = record.document.authorId === actor.id && RWAccess.has(record.highestPermission);
            if (!canDelete) {
                throw new HTTP403Error('Not authorized');
            }

            const model = (await db.delete({
                where: { id: id },
                include: {
                    documentRoot: {
                        include: {
                            rootGroupPermissions: { select: { access: true, studentGroupId: true } },
                            rootUserPermissions: { select: { access: true, userId: true } }
                        }
                    }
                }
            })) satisfies DbDocument;
            return model;
        },

        async updateConstraints(actor: User, id: string, update: UniquenessConstraints) {
            const record = await this.findModel(actor, id);
            if (!record) {
                throw new HTTP404Error('Document not found');
            }
            if (record.document.authorId !== actor.id || !RWAccess.has(record.highestPermission)) {
                throw new HTTP403Error('Not authorized');
            }
            const model = await db.update({
                where: { id: id },
                data: update,
                include: {
                    documentRoot: {
                        include: {
                            rootGroupPermissions: { select: { access: true, studentGroupId: true } },
                            rootUserPermissions: { select: { access: true, userId: true } }
                        }
                    }
                }
            });
            return model;
        },

        async allOfDocumentRoots(
            actor: User,
            documentRootIds: string[],
            authorId?: string
        ): Promise<DbDocument[]> {
            if (!hasElevatedAccess(actor.role)) {
                throw new HTTP403Error('Not authorized');
            }
            if (actor.role === Role.ADMIN) {
                return db.findMany({
                    where: { documentRootId: { in: documentRootIds }, authorId: authorId }
                });
            }
            // only include documents where the author is in the same group as the actor.
            const documents = await db.findMany({
                where: {
                    documentRootId: { in: documentRootIds },
                    author: {
                        id: authorId,
                        studentGroups: {
                            some: {
                                studentGroup: {
                                    users: { some: { userId: actor.id, isAdmin: true } }
                                }
                            }
                        }
                    }
                }
            });
            return documents;
        }
    });
}

export default Document(prisma.document);
