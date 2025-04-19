import { Prisma, PrismaClient, StudentGroup as DbStudentGroup, User } from '@prisma/client';
import prisma from '../prisma';
import { HTTP403Error, HTTP404Error } from '../utils/errors/Errors';
import { createDataExtractor } from '../helpers/dataExtractor';

const getData = createDataExtractor<Prisma.StudentGroupUncheckedUpdateInput>(
    ['description', 'name'],
    ['parentId']
);

type ApiStudentGroup = DbStudentGroup & {
    userIds: string[];
};

const asApiRecord = (
    record: (DbStudentGroup & { users: { userId: string }[] }) | null
): ApiStudentGroup | null => {
    if (!record) {
        return null;
    }
    const group = {
        ...record,
        userIds: record.users.map((user) => user.userId)
    };
    delete (group as any).users;
    return group;
};

function StudentGroup(db: PrismaClient['studentGroup']) {
    return Object.assign(db, {
        async findModel(id: string): Promise<ApiStudentGroup | null> {
            const model = await db.findUnique({
                where: {
                    id: id
                },
                include: {
                    users: {
                        select: {
                            userId: true
                        }
                    }
                }
            });
            return asApiRecord(model);
        },

        async updateModel(actor: User, id: string, data: Partial<DbStudentGroup>): Promise<DbStudentGroup> {
            const record = await this.findModel(id);
            if (!record) {
                throw new HTTP404Error('Group not found');
            }
            if (!actor.isAdmin) {
                throw new HTTP403Error('Not authorized');
            }
            /** remove fields not updatable*/
            const sanitized = getData(data, false, actor.isAdmin);
            return db.update({
                where: {
                    id: id
                },
                data: sanitized
            });
        },

        async addUser(actor: User, id: string, userId: string): Promise<DbStudentGroup> {
            if (!actor.isAdmin) {
                throw new HTTP403Error('Not authorized');
            }
            const record = await this.findModel(id);
            if (!record) {
                throw new HTTP404Error('Group not found');
            }
            /** remove fields not updatable*/
            return db.update({
                where: {
                    id: id
                },
                data: {
                    users: {
                        connectOrCreate: {
                            where: {
                                id: {
                                    userId: userId,
                                    studentGroupId: record.id
                                }
                            },
                            create: {
                                userId: userId
                            }
                        }
                    }
                }
            });
        },

        async removeUser(actor: User, id: string, userId: string): Promise<DbStudentGroup> {
            if (!actor.isAdmin) {
                throw new HTTP403Error('Not authorized');
            }
            const record = await this.findModel(id);
            if (!record) {
                throw new HTTP404Error('Group not found');
            }
            /** remove fields not updatable*/
            return db.update({
                where: {
                    id: id
                },
                data: {
                    users: {
                        delete: {
                            id: {
                                userId: userId,
                                studentGroupId: record.id
                            }
                        }
                    }
                }
            });
        },

        async all(actor: User): Promise<ApiStudentGroup[]> {
            // TODO: Does this behaviour make sense?
            //  Yes, it might be useful (a) for an admin to get all groups, and (b) for a user or admin to get all
            //  groups containing a specific user. However, this method now combines two separate behaviors and can't
            //  be used to get the groups that an admin is part of (which may not be required, but the behavior is still
            //  somewhat unexpected). Also, do we want to return the user IDs or not?
            //
            // user IDs should be provided, otherwise the frontend will not be able to relate the groups to the users
            const all = await db.findMany({
                where: actor.isAdmin
                    ? undefined
                    : {
                          users: {
                              some: {
                                  userId: actor.id
                              }
                          }
                      },
                include: {
                    users: {
                        select: {
                            userId: true
                        }
                    }
                }
            });
            return all.map((group) => asApiRecord(group)!);
        },

        async createModel(
            name: string,
            description: string,
            parentId: string | null
        ): Promise<DbStudentGroup> {
            // TODO: Guard against nonexistent parent if parentId is specified?
            return db.create({
                data: {
                    name: name,
                    description: description,
                    parentId: parentId
                }
            });
        },

        async deleteModel(actor: User, id: string): Promise<DbStudentGroup> {
            return db.delete({
                where: {
                    id: id
                }
            });
        }
    });
}

export default StudentGroup(prisma.studentGroup);
