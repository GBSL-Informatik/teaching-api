import prisma from '../prisma';
import {
    Access,
    Document,
    DocumentRoot as DbDocumentRoot,
    PrismaClient,
    RootGroupPermission,
    RootUserPermission,
    User,
    Role
} from '@prisma/client';
import { ApiDocument } from './Document';
import { ApiUserPermission } from './RootUserPermission';
import { ApiGroupPermission } from './RootGroupPermission';
import { HTTP403Error, HTTP404Error } from '../utils/errors/Errors';
import { asDocumentRootAccess, asGroupAccess, asUserAccess } from '../helpers/accessPolicy';
import { hasElevatedAccess } from './User';

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

export type ApiDocumentRootWithoutDocuments = Omit<ApiDocumentRoot, 'documents'>;

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

const { ADMIN_USER_GROUP_ID } = process.env;

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
                /**
                 * The user does not have documents in the requested document root (and thus no docRoot is returned from the view).
                 * In this case, we have to load the document root directly.
                 */
                const docRoot = await db.findUnique({
                    where: {
                        id: id
                    },
                    include: {
                        rootUserPermissions: {
                            where: {
                                userId: actor.id
                            }
                        },
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
                        }
                    }
                });
                if (!docRoot) {
                    return null;
                }
                return {
                    ...docRoot,
                    documents: [],
                    userPermissions: docRoot.rootUserPermissions.map((p) => prepareUserPermission(p)),
                    groupPermissions: docRoot.rootGroupPermissions.map((p) => prepareGroupPermission(p))
                };
            }
            delete (documentRoot as any).userId;
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
             * In this case, we have to load these documentRoots too.
             */
            if (missingDocumentRoots.length > 0 && !ignoreMissingRoots) {
                const docRoots = await db.findMany({
                    where: {
                        id: {
                            in: missingDocumentRoots
                        }
                    },
                    include: {
                        rootUserPermissions: {
                            where: {
                                userId: actorId
                            }
                        },
                        rootGroupPermissions: {
                            where: {
                                studentGroup: {
                                    users: {
                                        some: {
                                            userId: actorId
                                        }
                                    }
                                }
                            }
                        }
                    }
                });
                response.push(
                    ...docRoots.map((docRoot) => ({
                        ...docRoot,
                        documents: [],
                        userPermissions: docRoot.rootUserPermissions.map((p) => prepareUserPermission(p)),
                        groupPermissions: docRoot.rootGroupPermissions.map((p) => prepareGroupPermission(p))
                    }))
                );
            }
            return response;
        },
        async createModel(id: string, config: Config = {}): Promise<ApiDocumentRootWithoutDocuments> {
            const groupPermissions = config.groupPermissions || [];
            const access = asDocumentRootAccess(config.access);
            if (
                access !== Access.RW_DocumentRoot &&
                ADMIN_USER_GROUP_ID &&
                !groupPermissions.some((gp) => gp.groupId === ADMIN_USER_GROUP_ID)
            ) {
                groupPermissions.push({
                    groupId: ADMIN_USER_GROUP_ID,
                    access: Access.RW_DocumentRoot
                });
            }
            const model = await db.create({
                data: {
                    id: id,
                    access: access,
                    sharedAccess: config.sharedAccess || Access.None_DocumentRoot,
                    /* 0 is falsey in JS (since TS strictNullChecks is on, `grouPermissions?.length > 0` is not valid) */
                    rootGroupPermissions: groupPermissions.length
                        ? {
                              createMany: {
                                  data: groupPermissions.map((p) => ({
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
        async updateModel(id: string, data: UpdateConfig): Promise<ApiDocumentRootWithoutDocuments> {
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
            if (!hasElevatedAccess(actor.role)) {
                throw new HTTP403Error('Not authorized');
            }
            const userPermissions = await prisma.rootUserPermission.findMany({
                where: {
                    documentRootId: id,
                    ...(actor.role === Role.ADMIN
                        ? {}
                        : {
                              user: {
                                  studentGroups: {
                                      some: {
                                          userId: actor.id,
                                          isAdmin: true
                                      }
                                  }
                              }
                          })
                }
            });
            const groupPermissions = await prisma.rootGroupPermission.findMany({
                where: {
                    documentRootId: id,
                    ...(actor.role === Role.ADMIN
                        ? {}
                        : {
                              user: {
                                  studentGroups: {
                                      some: {
                                          userId: actor.id,
                                          isAdmin: true
                                      }
                                  }
                              }
                          })
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
            if (actor.role !== Role.ADMIN) {
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
