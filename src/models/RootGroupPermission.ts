import { Access, PrismaClient, RootGroupPermission as DbGroupPermission } from '@prisma/client';
import prisma from '../prisma';

// TODO: Consider checking existence of documentRoot / studentGroup to provide better error messages / exceptions.

export type ApiGroupPermission = {
    id: string;
    groupId: string;
    access: Access;
};

function asApiRecord(dbResult: DbGroupPermission): ApiGroupPermission {
    return {
        id: dbResult.id,
        groupId: dbResult.studentGroupId,
        access: dbResult.access
    };
}

function RootGroupPermission(db: PrismaClient['rootGroupPermission']) {
    return Object.assign(db, {
        async createModel(
            documentRootId: string,
            studentGroupId: string,
            access: Access
        ): Promise<ApiGroupPermission> {
            const result = await db.create({
                data: {
                    documentRootId: documentRootId,
                    studentGroupId: studentGroupId,
                    access: access
                }
            });
            return asApiRecord(result);
        },

        async updateModel(id: string, access: Access): Promise<ApiGroupPermission> {
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

        async deleteModel(id: string): Promise<ApiGroupPermission> {
            const result = await db.delete({
                where: {
                    id: id
                }
            });
            return asApiRecord(result);
        }
    });
}

export default RootGroupPermission(prisma.rootGroupPermission);