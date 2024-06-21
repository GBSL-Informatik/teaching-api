import { Prisma, PrismaClient, Role, User as DbUser } from '@prisma/client';
import prisma from '../prisma';
import { HTTP403Error, HTTP404Error } from '../utils/errors/Errors';
import { createDataExtractor } from '../helpers/dataExtractor';
import Logger from '../utils/logger';
const getData = createDataExtractor<Prisma.UserUncheckedUpdateInput>(['firstName', 'lastName']);

function User(db: PrismaClient['user']) {
    return Object.assign(db, {
        async findModel(id: string): Promise<DbUser | null> {
            return await db.findUnique({ where: { id } });
        },
        async updateModel(actor: DbUser, id: string, data: Partial<DbUser>): Promise<DbUser> {
            const record = await db.findUnique({ where: { id: id } });
            if (!record) {
                throw new HTTP404Error('User not found');
            }
            if (!(record.id === actor.id || actor.role === Role.ADMIN)) {
                throw new HTTP403Error('Not authorized');
            }
            /** remove fields not updatable*/
            const sanitized = getData(data);
            return await db.update({
                where: {
                    id: id
                },
                data: sanitized
            });
        },
        async all(actor: DbUser): Promise<DbUser[]> {
            if (actor.role === Role.ADMIN) {
                return await db.findMany({});
            }
            return await db.findMany({
                where: {
                    userGroups: {
                        some: {
                            AND: {
                                group: {
                                    users: {
                                        some: {
                                            userId: actor.id
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                distinct: ['id']
            });
        },
        async setRole(actor: DbUser, userId: string, role: Role): Promise<DbUser> {
            if (actor.role !== Role.ADMIN) {
                throw new HTTP403Error('Not authorized');
            }
            return await db.update({
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
