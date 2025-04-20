import { Prisma, PrismaClient, StudentGroup as DbStudentGroup, User, Role } from '@prisma/client';
import prisma from '../prisma';
import { HTTP403Error, HTTP404Error } from '../utils/errors/Errors';
import { createDataExtractor } from '../helpers/dataExtractor';
import { hasElevatedAccess } from './User';

const getData = createDataExtractor<Prisma.StudentGroupUncheckedUpdateInput>(
    ['description', 'name'],
    ['parentId']
);

type ApiStudentGroup = DbStudentGroup & {
    userIds: string[];
    adminIds: string[];
};

const asApiRecord = (
    record: (DbStudentGroup & { users: { userId: string; isAdmin: boolean }[] }) | null
): ApiStudentGroup | null => {
    if (!record) {
        return null;
    }
    const group = {
        ...record,
        userIds: record.users.map((user) => user.userId),
        adminIds: record.users.filter((u) => u.isAdmin).map((u) => u.userId)
    };
    delete (group as any).users;
    return group;
};

/**
 * returns true if the user can administer the group.
 * The user is either
 * - an admin, or
 * - a teacher and an admin of the group
 */
const hasAdminAccess = (actor: User, record?: ApiStudentGroup | null): record is ApiStudentGroup => {
    const elevatedAccess = hasElevatedAccess(actor.role);
    if (!record) {
        if (!elevatedAccess) {
            return false;
        }
        // only users with elevated access should be able to see that the group does not exist
        throw new HTTP404Error('Group not found');
    }
    if (actor.role !== Role.ADMIN && !record.adminIds.includes(actor.id)) {
        return false;
    }
    return true;
};

function StudentGroup(db: PrismaClient['studentGroup']) {
    return Object.assign(db, {
        async findModel(actor: User, id: string): Promise<ApiStudentGroup | null> {
            const adminAccess = actor.role === Role.ADMIN;
            const model = await db.findUnique({
                where: {
                    id: id,
                    ...(adminAccess
                        ? {}
                        : {
                              users: {
                                  some: {
                                      userId: actor.id,
                                      isAdmin: true
                                  }
                              }
                          })
                },
                include: {
                    users: {
                        select: {
                            userId: true,
                            isAdmin: true
                        }
                    }
                }
            });
            return asApiRecord(model);
        },

        async updateModel(actor: User, id: string, data: Partial<DbStudentGroup>): Promise<DbStudentGroup> {
            const record = await this.findModel(actor, id);
            if (!hasAdminAccess(actor, record)) {
                throw new HTTP403Error('Not authorized');
            }
            /** remove fields not updatable*/
            const sanitized = getData(data, false, hasElevatedAccess(actor.role));
            const parentId =
                typeof sanitized.parentId === 'string' ? sanitized.parentId : sanitized.parentId?.set;
            if (parentId && actor.role !== Role.ADMIN) {
                const isParentAdmin = await prisma.userStudentGroup.findFirst({
                    where: {
                        studentGroupId: parentId,
                        userId: actor.id,
                        isAdmin: true
                    }
                });
                if (!isParentAdmin) {
                    throw new HTTP403Error('Not authorized to create subgroup in this group');
                }
            }
            return db.update({
                where: {
                    id: id
                },
                data: sanitized
            });
        },

        async setAdminRole(
            actor: User,
            id: string,
            userId: string,
            isAdmin: boolean
        ): Promise<DbStudentGroup> {
            const record = await this.findModel(actor, id);
            if (!hasAdminAccess(actor, record)) {
                throw new HTTP403Error('Not authorized');
            }
            if (
                actor.id === userId &&
                !isAdmin &&
                record!.adminIds.includes(userId) &&
                record!.adminIds.length === 1
            ) {
                throw new HTTP403Error('Cannot remove admin role from self if the last admin');
            }

            /** remove fields not updatable*/
            return db.update({
                where: {
                    id: id
                },
                data: {
                    users: {
                        update: {
                            where: {
                                id: {
                                    userId: userId,
                                    studentGroupId: record.id
                                }
                            },
                            data: {
                                isAdmin: isAdmin
                            }
                        }
                    }
                }
            });
        },

        async addUser(actor: User, id: string, userId: string): Promise<DbStudentGroup> {
            const record = await this.findModel(actor, id);
            if (!hasAdminAccess(actor, record)) {
                throw new HTTP403Error('Not authorized');
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
            const record = await this.findModel(actor, id);
            if (!hasAdminAccess(actor, record)) {
                throw new HTTP403Error('Not authorized');
            }
            if (actor.id === userId && record!.adminIds.includes(userId) && record!.adminIds.length === 1) {
                throw new HTTP403Error('Cannot remove self from group if the last admin');
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
                where:
                    actor.role === Role.ADMIN
                        ? undefined
                        : {
                              users: {
                                  some: {
                                      userId: actor.id,
                                      isAdmin: true
                                  }
                              }
                          },
                include: {
                    users: {
                        select: {
                            userId: true,
                            isAdmin: true
                        }
                    }
                }
            });
            return all.map((group) => asApiRecord(group)!);
        },

        async createModel(
            actor: User,
            name: string,
            description: string,
            parentId: string | null
        ): Promise<ApiStudentGroup> {
            if (!hasElevatedAccess(actor.role)) {
                throw new HTTP403Error('Not authorized');
            }
            if (actor.role !== Role.ADMIN && parentId) {
                const isParentAdmin = await prisma.userStudentGroup.findFirst({
                    where: {
                        studentGroupId: parentId,
                        userId: actor.id,
                        isAdmin: true
                    }
                });
                if (!isParentAdmin) {
                    throw new HTTP403Error('Not authorized to create subgroup in this group');
                }
            }
            const model = await db.create({
                data: {
                    name: name,
                    description: description,
                    parentId: parentId,
                    users: {
                        create: {
                            userId: actor.id,
                            isAdmin: true
                        }
                    }
                },
                include: {
                    users: {
                        select: {
                            userId: true,
                            isAdmin: true
                        }
                    }
                }
            });
            return asApiRecord(model)!;
        },

        async deleteModel(actor: User, id: string): Promise<DbStudentGroup> {
            const record = await this.findModel(actor, id);
            if (!hasAdminAccess(actor, record)) {
                throw new HTTP403Error('Not authorized');
            }
            return db.delete({
                where: {
                    id: id
                }
            });
        }
    });
}

export default StudentGroup(prisma.studentGroup);
