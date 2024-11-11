import prisma from '../prisma';
import {
    Access,
    Document,
    DocumentRoot as DbDocumentRoot,
    PrismaClient,
    RootGroupPermission,
    RootUserPermission,
    User
} from '@prisma/client';
import { ApiDocument } from './Document';
import { ApiUserPermission } from './RootUserPermission';
import { ApiGroupPermission } from './RootGroupPermission';
import { HTTP403Error, HTTP404Error } from '../utils/errors/Errors';
import { asDocumentRootAccess, asGroupAccess, asUserAccess } from '../helpers/accessPolicy';

export type ApiDocumentRoot = DbDocumentRoot & {
    documents: ApiDocument[];
    userPermissions: ApiUserPermission[];
    groupPermissions: ApiGroupPermission[];
};

type Permissions = {
    id: string;
    userPermissions: ApiUserPermission[];
    groupPermissions: ApiGroupPermission[];
};

export type ApiDocumentRootUpdate = DbDocumentRoot & Permissions;

export type AccessCheckableDocumentRoot = DbDocumentRoot & {
    rootGroupPermissions: RootGroupPermission[];
    rootUserPermissions: RootUserPermission[];
};

export type AccessCheckableDocumentRootWithDocuments = AccessCheckableDocumentRoot & {
    documents: Document[];
};

export interface Config {
    access?: Access; // Access level of document root
    sharedAccess?: Access; // Access level of shared documents
    userPermissions?: Omit<ApiUserPermission, 'id'>[];
    groupPermissions?: Omit<ApiGroupPermission, 'id'>[];
}

export interface UpdateConfig {
    access?: Access;
    sharedAccess?: Access;
}

const prepareGroupPermission = (permission: RootGroupPermission): ApiGroupPermission => {
    return {
        id: permission.id,
        access: permission.access,
        groupId: permission.studentGroupId
    };
};

const prepareUserPermission = (permission: RootUserPermission): ApiUserPermission => {
    return {
        id: permission.id,
        access: permission.access,
        userId: permission.userId
    };
};

function DocumentRoot(db: PrismaClient['documentRoot']) {
    return Object.assign(db, {
        async findModel(actor: User, id: string): Promise<ApiDocumentRoot | null> {
            const documentRoot = (await prisma.view_UsersDocuments.findUnique({
                where: {
                    id_userId: {
                        id: id,
                        userId: actor.id
                    }
                }
            })) as ApiDocumentRoot | null;
            if (!documentRoot) {
                const docRoot = await db.findUnique({
                    where: {
                        id: id
                    }
                });
                if (!docRoot) {
                    return null;
                }
                return {
                    ...docRoot,
                    documents: [],
                    userPermissions: [],
                    groupPermissions: []
                };
            }
            if (documentRoot) {
                delete (documentRoot as any).userId;
            }
            return documentRoot;
        },
        async findManyModels(
            actorId: string,
            ids: string[],
            ignoreMissingRoots: boolean = false
        ): Promise<ApiDocumentRoot[] | null> {
            const documentRoots = (await prisma.view_UsersDocuments.findMany({
                where: {
                    id: {
                        in: ids
                    },
                    userId: actorId
                },
                relationLoadStrategy: 'query'
            })) as unknown as ApiDocumentRoot[];
            const response = documentRoots
                .filter((docRoot) => docRoot !== null)
                .map((docRoot) => {
                    delete (docRoot as any).userId;
                    return docRoot;
                });
            const missingDocumentRoots = ids.filter(
                (id) => !documentRoots.find((docRoot) => docRoot.id === id)
            );
            /**
             * Possibly the user does not have documents in the requested document roots (and thus no docRoot is returned above).
             * In this case, we have to load these document roots without the document roots.
             */
            if (missingDocumentRoots.length > 0 && !ignoreMissingRoots) {
                const docRoots = await db.findMany({
                    where: {
                        id: {
                            in: missingDocumentRoots
                        }
                    }
                });
                response.push(
                    ...docRoots.map((docRoot) => ({
                        ...docRoot,
                        documents: [],
                        userPermissions: [],
                        groupPermissions: []
                    }))
                );
            }
            return response;
        },
        async createModel(id: string, config: Config = {}): Promise<DbDocumentRoot> {
            return db.create({
                data: {
                    id: id,
                    access: asDocumentRootAccess(config.access),
                    sharedAccess: config.sharedAccess || Access.None_DocumentRoot,
                    /* 0 is falsey in JS (since TS strictNullChecks is on, `grouPermissions?.length > 0` is not valid) */
                    rootGroupPermissions: config.groupPermissions?.length
                        ? {
                              createMany: {
                                  data: config.groupPermissions.map((p) => ({
                                      access: asGroupAccess(p.access),
                                      studentGroupId: p.groupId
                                  }))
                              }
                          }
                        : undefined,
                    rootUserPermissions: config.userPermissions?.length
                        ? {
                              createMany: {
                                  data: config.userPermissions.map((p) => ({
                                      ...p,
                                      access: asUserAccess(p.access)
                                  }))
                              }
                          }
                        : undefined
                }
            });
        },
        async updateModel(id: string, data: UpdateConfig): Promise<ApiDocumentRootUpdate> {
            const model = await db.update({
                where: {
                    id: id
                },
                data: {
                    access: asDocumentRootAccess(data.access),
                    sharedAccess: data.sharedAccess
                },
                include: {
                    rootGroupPermissions: true,
                    rootUserPermissions: true
                }
            });

            return {
                id: model.id,
                access: model.access,
                sharedAccess: model.sharedAccess,
                userPermissions: model.rootUserPermissions.map((p) => prepareUserPermission(p)),
                groupPermissions: model.rootGroupPermissions.map((p) => prepareGroupPermission(p))
            };
        },
        async getPermissions(actor: User, id: string): Promise<Permissions> {
            if (!actor.isAdmin) {
                throw new HTTP403Error('Not authorized');
            }
            const userPermissions = await prisma.rootUserPermission.findMany({
                where: {
                    documentRootId: id
                }
            });
            const groupPermissions = await prisma.rootGroupPermission.findMany({
                where: {
                    documentRootId: id
                }
            });
            return {
                id: id,
                userPermissions: userPermissions.map(prepareUserPermission),
                groupPermissions: groupPermissions.map(prepareGroupPermission)
            };
        },
        async deleteModel(actor: User, id: string) {
            const record = await this.findModel(actor, id);
            if (!record) {
                throw new HTTP404Error('DocumentRoot not found');
            }
            if (!actor.isAdmin) {
                throw new HTTP403Error('Not authorized');
            }

            const model = await db.delete({
                where: {
                    id: id
                },
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
            });
            return model;
        }
    });
}

export default DocumentRoot(prisma.documentRoot);
