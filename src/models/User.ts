import { Prisma, PrismaClient, User as DbUser, Role } from '@prisma/client';
import prisma from '../prisma';
import { HTTP403Error, HTTP404Error } from '../utils/errors/Errors';
import { createDataExtractor } from '../helpers/dataExtractor';
const getData = createDataExtractor<Prisma.UserUncheckedUpdateInput>(['firstName', 'lastName'], ['role']);

export const hasElevatedAccess = (role?: Role | null) => {
    if (!role) {
        return false;
    }
    return role === Role.ADMIN || role === Role.TEACHER;
};

function User(db: PrismaClient['user']) {
    return Object.assign(db, {
        async findModel(id: string): Promise<DbUser | null> {
            return db.findUnique({ where: { id } });
        },

        async updateModel(actor: DbUser, id: string, data: Partial<DbUser>): Promise<DbUser> {
            const record = await db.findUnique({ where: { id: id } });
            if (!record) {
                throw new HTTP404Error('User not found');
            }
            const elevatedAccess = hasElevatedAccess(actor.role);
            if (!(record.id === actor.id || elevatedAccess)) {
                throw new HTTP403Error('Not authorized');
            }
            /** remove fields not updatable*/
            const sanitized = getData(data, false, record.id === actor.id ? false : elevatedAccess);
            return db.update({
                where: {
                    id: id
                },
                data: sanitized
            });
        },

        async all(actor: DbUser): Promise<DbUser[]> {
            if (hasElevatedAccess(actor.role)) {
                return db.findMany({});
            }
            return db.findMany({
                where: {
                    OR: [
                        {
                            id: actor.id
                        },
                        {
                            studentGroups: {
                                some: {
                                    userId: actor.id
                                }
                            }
                        }
                    ]
                },
                distinct: ['id']
            });
        },

        async setRole(actor: DbUser, userId: string, role: Role): Promise<DbUser> {
            if (!hasElevatedAccess(actor.role)) {
                throw new HTTP403Error('Not authorized');
            }
            if (role === Role.ADMIN && actor.role !== Role.ADMIN) {
                throw new HTTP403Error('Not authorized');
            }
            if (role === Role.STUDENT && actor.id === userId) {
                throw new HTTP403Error('Not allowed to set yourself as student');
            }
            return db.update({
                where: {
                    id: userId
                },
                data: {
                    role: role
                }
            });
        }
    });
}

export default User(prisma.user);
