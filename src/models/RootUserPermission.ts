import { Access, PrismaClient } from '@prisma/client';
import prisma from '../prisma';

// TODO: Consider checking existence of documentRoot / user to provide better error messages / exceptions.

function RootUserPermission(db: PrismaClient['rootUserPermission']) {
    return Object.assign(db, {
        async createModel(documentRootId: string, userId: string, access: Access) {
            return db.create({
                data: {
                    documentRootId: documentRootId,
                    userId: userId,
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

export default RootUserPermission(prisma.rootUserPermission);
