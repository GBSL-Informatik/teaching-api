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
import { ApiDocument, prepareDocument } from './Document';
import { ApiUserPermission } from './RootUserPermission';
import { ApiGroupPermission } from './RootGroupPermission';

export type ApiDocumentRoot = DbDocumentRoot & {
    documents: ApiDocument[];
    userPermissions: ApiUserPermission[];
    groupPermissions: ApiGroupPermission[];
};

export type ApiDocumentRootUpdate = DbDocumentRoot & {
    userPermissions: ApiUserPermission[];
    groupPermissions: ApiGroupPermission[];
};

export type AccessCheckableDocumentRoot = DbDocumentRoot & {
    rootGroupPermissions: RootGroupPermission[];
    rootUserPermissions: RootUserPermission[];
};

export type AccessCheckableDocumentRootWithDocuments = AccessCheckableDocumentRoot & {
    documents: Document[];
};

export interface Config {
    access?: Access; // Access level of document root
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

const prepareDocumentRoot = (
    actor: User,
    documentRoot: AccessCheckableDocumentRootWithDocuments | null
): ApiDocumentRoot | null => {
    if (!documentRoot) {
        return null;
    }
    const model: ApiDocumentRoot = {
        ...documentRoot,
        userPermissions: documentRoot.rootUserPermissions.map(prepareUserPermission),
        groupPermissions: documentRoot.rootGroupPermissions.map(prepareGroupPermission),
        documents: documentRoot.documents
            .map((d) => prepareDocument(actor, { ...d, documentRoot: documentRoot })?.document)
            .filter((d) => !!d)
    };
    delete (model as Partial<AccessCheckableDocumentRootWithDocuments>).rootGroupPermissions;
    delete (model as Partial<AccessCheckableDocumentRootWithDocuments>).rootUserPermissions;
    return model;
};

function DocumentRoot(db: PrismaClient['documentRoot']) {
    return Object.assign(db, {
        async findModel(actor: User, id: string) {
            const documentRoot = await db.findUnique({
                where: {
                    id: id
                },
                include: {
                    documents: {
                        where: {
                            OR: [
                                {
                                    author: actor
                                },
                                {
                                    documentRoot: {
                                        sharedAccess: { in: [Access.RO, Access.RW] },
                                        OR: [
                                            {
                                                rootGroupPermissions: {
                                                    some: {
                                                        studentGroup: {
                                                            users: {
                                                                some: {
                                                                    id: actor.id
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                            },
                                            {
                                                rootUserPermissions: {
                                                    some: {
                                                        userId: actor.id
                                                    }
                                                }
                                            }
                                        ]
                                    }
                                }
                            ]
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
                    },
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
            });
            return prepareDocumentRoot(actor, documentRoot);
        },
        async createModel(id: string, config: Config = {}): Promise<DbDocumentRoot> {
            return db.create({
                data: {
                    id: id,
                    access: config.access ?? Access.RW,
                    /* 0 is falsey in JS (since TS strictNullChecks is on, `grouPermissions?.length > 0` is not valid) */
                    rootGroupPermissions: config.groupPermissions?.length
                        ? {
                              createMany: {
                                  data: config.groupPermissions.map((p) => ({
                                      access: p.access,
                                      studentGroupId: p.groupId
                                  }))
                              }
                          }
                        : undefined,
                    rootUserPermissions: config.userPermissions?.length
                        ? {
                              createMany: {
                                  data: config.userPermissions
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
                    access: data.access,
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
        }
    });
}

export default DocumentRoot(prisma.documentRoot);
