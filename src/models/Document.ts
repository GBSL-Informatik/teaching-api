import { Access, Document as DbDocument, PrismaClient, Role, User } from '@prisma/client';
import prisma from '../prisma';
import { HTTP403Error, HTTP404Error } from '../utils/errors/Errors';
import { JsonObject } from '@prisma/client/runtime/library';
import DocumentRoot, { AccessCheckableDocumentRoot } from './DocumentRoot';
import { highestAccess, NoneAccess, RWAccess } from '../helpers/accessPolicy';
import { ApiGroupPermission } from './RootGroupPermission';
import { ApiUserPermission } from './RootUserPermission';
import Logger from '../utils/logger';
import { hasElevatedAccess, whereStudentGroupAccess } from './User';

type AccessCheckableDocument = DbDocument & {
    documentRoot: AccessCheckableDocumentRoot;
};

export type ApiDocument = DbDocument;

interface DocumentWithPermission {
    document: ApiDocument;
    highestPermission: Access;
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

export const prepareDocument = (actorId: string, document: AccessCheckableDocument | null) => {
    if (!document) {
        return null;
    }
    const permission = extractPermission(actorId, document);
    if (!permission) {
        return null;
    }
    const model: ApiDocument = { ...document };
    delete (model as Partial<AccessCheckableDocument>).documentRoot;
    if (NoneAccess.has(permission)) {
        model.data = null;
    }
    return { document: model, highestPermission: permission };
};

type Response<T> = {
    model: T;
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
                    where: {
                        id: id
                    },
                    include: {
                        documentRoot: {
                            include: {
                                rootGroupPermissions: {
                                    where: {
                                        studentGroup: {
                                            users: {
                                                some: {
                                                    userId: actor.id
                                                }
                                            }
                                        }
                                    }
                                },
                                rootUserPermissions: {
                                    where: {
                                        user: actor
                                    }
                                }
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
            uniqueMain?: boolean,
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
                            : {
                                  id: _onBehalfOfUserId,
                                  ...whereStudentGroupAccess(actor.id, true)
                              }
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
                if (
                    !(
                        parent.document.authorId === actor.id ||
                        elevatedAccess ||
                        RWAccess.has(parent.highestPermission)
                    )
                ) {
                    throw new HTTP403Error('Insufficient access permission');
                }
            }
            if (uniqueMain) {
                const mainDoc = await db.findFirst({
                    where: {
                        documentRootId: documentRootId,
                        authorId: authorId,
                        type: type
                    }
                });
                if (mainDoc) {
                    Logger.warn(
                        `[not unique]: Main document fro documentRoot "${documentRootId}" already exists for user "${authorId}"`
                    );
                    // the frontend may depend on the error message (try to not change: status code + [not unique])
                    throw new HTTP403Error('[not unique] Main document already exists for this user');
                }
            }
            /**
             * Since it is easyier to check wheter a user has permissions to create a model
             * when the model actually exists, we create the model first and then check the permissions.
             */
            const model = await db
                .create({
                    data: {
                        type: type,
                        documentRootId: documentRootId,
                        data: data,
                        parentId: parentId,
                        authorId: authorId
                    },
                    include: {
                        documentRoot: {
                            include: {
                                rootGroupPermissions: {
                                    where: {
                                        studentGroup: {
                                            users: {
                                                some: {
                                                    userId: authorId
                                                }
                                            }
                                        }
                                    }
                                },
                                rootUserPermissions: {
                                    where: {
                                        user: {
                                            id: authorId
                                        }
                                    }
                                }
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
                db.delete({
                    where: {
                        id: model.document.id
                    }
                });
                throw new HTTP403Error('Insufficient access permission');
            }
            return {
                model: model.document,
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
                            : {
                                  id: id,
                                  author: whereStudentGroupAccess(actor.id, true)
                              }
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
                where: {
                    id: id
                },
                data: {
                    data: docData
                },
                include: {
                    documentRoot: {
                        include: {
                            rootGroupPermissions: {
                                select: {
                                    access: true,
                                    studentGroupId: true
                                }
                            },
                            rootUserPermissions: {
                                select: {
                                    access: true,
                                    userId: true
                                }
                            }
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
                where: {
                    id: id
                },
                include: {
                    documentRoot: {
                        include: {
                            rootGroupPermissions: {
                                select: {
                                    access: true,
                                    studentGroupId: true
                                }
                            },
                            rootUserPermissions: {
                                select: {
                                    access: true,
                                    userId: true
                                }
                            }
                        }
                    }
                }
            })) satisfies DbDocument;
            return model;
        },

        async allOfDocumentRoots(actor: User, documentRootIds: string[]): Promise<DbDocument[]> {
            if (!hasElevatedAccess(actor.role)) {
                throw new HTTP403Error('Not authorized');
            }
            if (actor.role === Role.ADMIN) {
                return db.findMany({
                    where: {
                        documentRootId: {
                            in: documentRootIds
                        }
                    }
                });
            }
            // only include documents where the author is in the same group as the actor.
            const documents = await db.findMany({
                where: {
                    documentRootId: {
                        in: documentRootIds
                    },
                    author: whereStudentGroupAccess(actor.id, true)
                }
            });
            return documents;
        }
    });
}

export default Document(prisma.document);
