import { Prisma, PrismaClient, Role, Group as DbGroup, User } from '@prisma/client';
import prisma from '../prisma';
import { HTTP403Error, HTTP404Error } from '../utils/errors/Errors';
import { createDataExtractor } from '../helpers/dataExtractor';
import Logger from '../utils/logger';
const getData = createDataExtractor<Prisma.GroupUncheckedUpdateInput>([
    'description',
    'name'
]);

function Group(db: PrismaClient['group']) {
    return Object.assign(db, {
        async findModel(id: string): Promise<DbGroup | null> {
            return await db.findUnique({ where: { id } });
        },
        async updateModel(actor: User, id: string, data: Partial<DbGroup>): Promise<DbGroup> {
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
        async all(actor: User): Promise<DbGroup[]> {
            if (actor.role === Role.ADMIN) {
                return await db.findMany({});
            }
            return await db.findMany({
                where: {
                    users: {
                        some: {
                            userId: actor.id
                        }
                    }
                },
                include: {
                    users: {
                        include: {
                            user: true
                        }
                    }
                }
            });
        },
        async deleteModel(actor: User, id: string): Promise<DbGroup> {
            const record = await db.findUnique({ where: { id: id } });
            if (!record) {
                throw new HTTP404Error('User not found');
            }
            if (!(record.id === actor.id || actor.role === Role.ADMIN)) {
                throw new HTTP403Error('Not authorized');
            }
            /** remove fields not updatable*/
            return await db.delete({
                where: {
                    id: id
                }
            });
        },
    });
}

export default Group(prisma.group);
