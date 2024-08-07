import { Access, PrismaClient } from '@prisma/client';
import prisma from '../prisma';

// TODO: Consider checking existence of documentRoot / studentGroup to provide better error messages / exceptions.

function RootGroupPermission(db: PrismaClient['rootGroupPermission']) {
    return Object.assign(db, {
        async createModel(documentRootId: string, studentGroupId: string, access: Access) {
            return db.create({
                data: {
                    documentRootId: documentRootId,
                    studentGroupId: studentGroupId,
                    access: access
                }
            });
        },

        async updateModel(id: string, access: Access) {
            return db.update({
                where: {
                    id: id
                },
                data: {
                    access: access
                }
            });
        },

        async deleteModel(id: string) {
            return db.delete({
                where: {
                    id: id
                }
            });
        }
    });
}

export default RootGroupPermission(prisma.rootGroupPermission);
