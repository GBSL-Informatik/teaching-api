import { Access, PrismaClient, RootGroupPermission as DbGroupPermission } from '@prisma/client';
import prisma from '../prisma';
import { asGroupAccess } from '../helpers/accessPolicy';

// TODO: Consider checking existence of documentRoot / studentGroup to provide better error messages / exceptions.

export type ApiGroupPermission = {
    id: string;
    groupId: string;
    access: Access;
};

export type CompleteApiGroupPermission = {
    id: string;
    groupId: string;
    documentRootId: string;
    access: Access;
};

function asApiRecord(dbResult: DbGroupPermission): ApiGroupPermission {
    return {
        id: dbResult.id,
        groupId: dbResult.studentGroupId,
        access: dbResult.access
    };
}

function asCompleteApiRecord(dbResult: DbGroupPermission): CompleteApiGroupPermission {
    return {
        id: dbResult.id,
        groupId: dbResult.studentGroupId,
        documentRootId: dbResult.documentRootId,
        access: dbResult.access
    };
}

function RootGroupPermission(db: PrismaClient['rootGroupPermission']) {
    return Object.assign(db, {
        async createModel(
            documentRootId: string,
            studentGroupId: string,
            access: Access
        ): Promise<CompleteApiGroupPermission> {
            const result = await db.create({
                data: {
                    documentRootId: documentRootId,
                    studentGroupId: studentGroupId,
                    access: asGroupAccess(access)
                }
            });
            return asCompleteApiRecord(result);
        },

        async updateModel(id: string, access: Access): Promise<CompleteApiGroupPermission> {
            const result = await db.update({
                where: {
                    id: id
                },
                data: {
                    access: asGroupAccess(access)
                }
            });
            return asCompleteApiRecord(result);
        },

        async deleteModel(id: string): Promise<CompleteApiGroupPermission> {
            const result = await db.delete({
                where: {
                    id: id
                }
            });
            return asCompleteApiRecord(result);
        }
    });
}

export default RootGroupPermission(prisma.rootGroupPermission);
