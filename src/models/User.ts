import { Prisma, PrismaClient, User as DbUser } from '@prisma/client';
import prisma from '../prisma';
import { HTTP403Error, HTTP404Error } from '../utils/errors/Errors';
import { createDataExtractor } from '../helpers/dataExtractor';
const getData = createDataExtractor<Prisma.UserUncheckedUpdateInput>(['firstName', 'lastName']);

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
            if (!(record.id === actor.id || actor.isAdmin)) {
                throw new HTTP403Error('Not authorized');
            }
            /** remove fields not updatable*/
            const sanitized = getData(data);
            return db.update({
                where: {
                    id: id
                },
                data: sanitized
            });
        },

        async all(actor: DbUser): Promise<DbUser[]> {
            if (actor.isAdmin) {
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
                                    users: {
                                        some: {
                                            id: actor.id
                                        }
                                    }
                                }
                            }
                        }
                    ]
                },
                distinct: ['id']
            });
        },

        async setIsAdmin(actor: DbUser, userId: string, isAdmin: boolean): Promise<DbUser> {
            if (!actor.isAdmin) {
                throw new HTTP403Error('Not authorized');
            }
            return db.update({
                where: {
                    id: userId
                },
                data: {
                    isAdmin
                }
            });
        }
    });
}

export default User(prisma.user);
