import { Access, Document as DbDocument, PrismaClient, User } from '@prisma/client';
import prisma from '../prisma';
import { HTTP403Error, HTTP404Error } from '../utils/errors/Errors';
import { JsonObject } from '@prisma/client/runtime/library';
import DocumentRoot, {
    AccessCheckableDocumentRoot,
} from './DocumentRoot';
import { highestAccess } from '../helpers/accessPolicy';
import {ApiGroupPermission} from "./RootGroupPermission";
import {ApiUserPermission} from "./RootUserPermission";

type AccessCheckableDocument = DbDocument & {
    documentRoot: AccessCheckableDocumentRoot;
};

export type ApiDocument = DbDocument;

interface DocumentWithPermission {
    document: ApiDocument;
    highestPermission: Access;
}

const extractPermission = (actor: User, document: AccessCheckableDocument) => {
    if (document.documentRoot.sharedAccess === Access.None && document.authorId !== actor.id) {
        return null;
    }

    const permissions = new Set([
        document.documentRoot.access,
        ...document.documentRoot.rootGroupPermissions.map((p) => p.access),
        ...document.documentRoot.rootUserPermissions.map((p) => p.access)
    ]);
    const usersPermission = highestAccess(permissions);
    if (document.authorId === actor.id) {
        return usersPermission;
    }

    return highestAccess(new Set([document.documentRoot.sharedAccess]), usersPermission);
};

export const prepareDocument = (actor: User, document: AccessCheckableDocument | null) => {
    if (!document) {
        return null;
    }
    const permission = extractPermission(actor, document);
    if (!permission) {
        return null;
    }
    const model: ApiDocument = { ...document };
    delete (model as Partial<AccessCheckableDocument>).documentRoot;
    if (permission === Access.None) {
        model.data = null;
    }
    return { document: model, highestPermission: permission };
};

type Response<T> = {
    model: T;
    permissions: {
        access: Access;
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
                                                    id: actor.id
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
                .then((doc) => prepareDocument(actor, doc));
        },
        async createModel(
            actor: User,
            type: string,
            documentRootId: string,
            data: any,
            parentId?: string
        ): Promise<Response<ApiDocument>> {
            const documentRoot = await DocumentRoot.findModel(actor, documentRootId);
            if (!documentRoot) {
                throw new HTTP404Error('Document root not found');
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
                        actor.isAdmin ||
                        parent.highestPermission === Access.RW
                    )
                ) {
                    throw new HTTP403Error('Insufficient access permission');
                }
            }
            const model = await db
                .create({
                    data: {
                        type: type,
                        documentRootId: documentRootId,
                        data: data,
                        parentId: parentId,
                        authorId: actor.id
                    },
                    include: {
                        documentRoot: {
                            include: {
                                rootGroupPermissions: {
                                    where: {
                                        studentGroup: {
                                            users: {
                                                some: {
                                                    id: actor.id
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
                .then((doc) => prepareDocument(actor, doc)!);
            return {
                model: model.document,
                permissions: {
                    access: documentRoot.access,
                    group: documentRoot.groupPermissions,
                    user: documentRoot.userPermissions
                }
            };
        },

        async updateModel(actor: User, id: string, docData: JsonObject) {
            const record = await this.findModel(actor, id);
            if (!record) {
                throw new HTTP404Error('Document not found');
            }
            const canWrite = record.document.authorId === actor.id || record.highestPermission === Access.RW;
            if (!canWrite) {
                throw new HTTP403Error('Not authorized');
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

        async deleteModel(actor: User, id: string): Promise<DbDocument> {
            const record = await this.findModel(actor, id);
            if (!record) {
                throw new HTTP404Error('Document not found');
            }
            if (!(record.document.authorId === actor.id && record.highestPermission === Access.RW)) {
                throw new HTTP403Error('Not authorized');
            }

            // TODO: Notify connected clients.

            return db.delete({
                where: {
                    id: id
                }
            });
        },

        async all(actor: User): Promise<DbDocument[]> {
            // TODO: Only include documents where the (non-admin) user has at least RO access on the root.
            if (actor.isAdmin) {
                return db.findMany({});
            }
            return db.findMany({
                where: {
                    authorId: actor.id
                },
                include: {
                    author: true,
                    children: true
                }
            });
        }
    });
}

export default Document(prisma.document);
