import { Access, PrismaClient } from '@prisma/client';
import prisma from '../prisma';
import {RootUserPermission as DbRootUserPermission} from ".prisma/client";

// TODO: Consider checking existence of documentRoot / user to provide better error messages / exceptions.

export type ApiUserPermission = {
    id: string;
    userId: string;
    access: Access;
};

function asApiRecord(dbResult: DbRootUserPermission): ApiUserPermission {
    return {
        id: dbResult.id,
        userId: dbResult.userId,
        access: dbResult.access
    };
}

function RootUserPermission(db: PrismaClient['rootUserPermission']) {
    return Object.assign(db, {
        async createModel(documentRootId: string, userId: string, access: Access): Promise<ApiUserPermission> {
            const result = await db.create({
                data: {
                    documentRootId: documentRootId,
                    userId: userId,
                    access: access
                }
            });
            return asApiRecord(result);
        },

        async updateModel(id: string, access: Access): Promise<ApiUserPermission> {
            const result = await db.update({
                where: {
                    id: id
                },
                data: {
                    access: access
                }
            });
            return asApiRecord(result);
        },

        async deleteModel(id: string): Promise<ApiUserPermission> {
            const result = await db.delete({
                where: {
                    id: id
                }
            });
            return asApiRecord(result);
        }
    });
}

export default RootUserPermission(prisma.rootUserPermission);
