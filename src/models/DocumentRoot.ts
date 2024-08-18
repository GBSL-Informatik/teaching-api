import prisma from '../prisma';
import {
    Access,
    Document,
    DocumentRoot as DbDocumentRoot,
    PrismaClient,
    RootGroupPermission,
    RootUserPermission,
    User,
    view_DocumentUserPermissions,
    view_UsersDocuments
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
            if (documentRoot) {
                delete (documentRoot as any).userId;
            }
            return documentRoot;
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
