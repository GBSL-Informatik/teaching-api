import {
    Access,
    Document as DbDocument,
    DocumentRoot as DbDocumentRoot,
    Prisma,
    PrismaClient,
    RootGroupPermission,
    RootUserPermission,
    User
} from '@prisma/client';
import prisma from '../prisma';
import { HTTP403Error, HTTP404Error } from '../utils/errors/Errors';
import { JsonObject } from '@prisma/client/runtime/library';
import DocumentRoot, {
    AccessCheckableDocumentRoot,
    ApiDocumentRoot,
    ApiGroupPermission,
    ApiUserPermission
} from './DocumentRoot';
import { highestAccess } from '../helpers/accessPolicy';

type AccessCheckableDocument = DbDocument & {
    documentRoot: AccessCheckableDocumentRoot;
};

export type ApiDocument = DbDocument;

export const extractPermission = (actor: User, document: AccessCheckableDocument) => {
    const permissions = new Set([
        ...document.documentRoot.rootGroupPermissions.map((p) => p.access),
        ...document.documentRoot.rootUserPermissions.map((p) => p.access)
    ]);
    if (permissions.size === 0) {
        /**
         * - in case the actor is the author, allow root documents permission
         * - otherwise none
         */
        if (actor.id === document.authorId) {
            return document.documentRoot.access;
        }
        return Access.None;
    }
    permissions.add(document.documentRoot.access);
    return highestAccess(permissions);
};
export const prepareDocument = (actor: User, document: AccessCheckableDocument | null) => {
    if (!document) {
        return null;
    }
    const permission = extractPermission(actor, document);
    const model: ApiDocument = { ...document };
    delete (model as Partial<AccessCheckableDocument>).documentRoot;
    if (permission === Access.None) {
        model.data = null;
    }
    return model;
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
        async findModel(actor: User, id: string): Promise<ApiDocument | null> {
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
                 * TODO: this seems too permissive, should we check for RO/RW access instead?
                 */
                if (parent.authorId !== actor.id && !actor.isAdmin) {
                    throw new HTTP403Error('Not authorized');
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
                model: model,
                permissions: {
                    access: documentRoot.access,
                    group: documentRoot.groupPermissions,
                    user: documentRoot.userPermissions
                }
            };
        },

        async updateModel(actor: User, id: string, docData: JsonObject) {
            // TODO: Only allow updates if the user has RW access on the document's root.
            const record = await this.findModel(actor, id);
            if (!record) {
                throw new HTTP404Error('Document not found');
            }
            const canWrite = record.authorId === actor.id || actor.isAdmin; // TODO: Do we want admins to be able to make changes to non-owned documents?
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
            // TODO: Only allow deletion if the user has RW access on the document's root.
            const record = await db.findUnique({ where: { id: id } });
            if (!record) {
                throw new HTTP404Error('Document not found');
            }
            if (record.authorId !== actor.id && !actor.isAdmin) {
                throw new HTTP403Error('Not authorized');
            }
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
