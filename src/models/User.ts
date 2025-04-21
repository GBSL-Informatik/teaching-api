import { Prisma, PrismaClient, User as DbUser, Role, User } from '@prisma/client';
import prisma from '../prisma';
import { HTTP403Error, HTTP404Error } from '../utils/errors/Errors';
import { createDataExtractor } from '../helpers/dataExtractor';
import _ from 'lodash';
const getData = createDataExtractor<Prisma.UserUncheckedUpdateInput>(['firstName', 'lastName'], ['role']);

const RoleAccessLevel: { [key in Role]: number } = {
    [Role.STUDENT]: 0,
    [Role.TEACHER]: 1,
    [Role.ADMIN]: 2
};

export const hasElevatedAccess = (role?: Role | null) => {
    if (!role) {
        return false;
    }
    return RoleAccessLevel[role] > 0;
};

export const whereStudentGroupAccess = (userId: string, isAdmin?: boolean) => ({
    studentGroups: {
        some: {
            studentGroup: {
                users: {
                    some:
                        isAdmin === undefined
                            ? { userId }
                            : {
                                  userId,
                                  isAdmin
                              }
                }
            }
        }
    }
});

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
                /**
                 * Admins and teachers can see all users.
                 * Reason: teachers need to add new users to their student groups
                 */
                return db.findMany({});
            }
            const users = await db.findMany({
                where: {
                    OR: [
                        {
                            id: actor.id
                        },
                        whereStudentGroupAccess(actor.id)
                    ]
                },
                distinct: ['id']
            });
            return users;
        },

        async setRole(actor: DbUser, userId: string, role: Role): Promise<DbUser> {
            if (!hasElevatedAccess(actor.role)) {
                throw new HTTP403Error('Not authorized');
            }
            const actorLevel = RoleAccessLevel[actor.role];
            const roleLevel = RoleAccessLevel[role];
            if (actorLevel <= roleLevel) {
                throw new HTTP403Error('Not allowed to set a higher role');
            }
            if (actor.id === userId && roleLevel < actorLevel) {
                throw new HTTP403Error('Not allowed to lower own role');
            }
            const record = await this.findModel(userId);
            if (!record) {
                throw new HTTP404Error('User not found');
            }
            const recordLevel = RoleAccessLevel[record.role];
            if (recordLevel >= actorLevel) {
                throw new HTTP403Error('Not allowed to lower role of user with higher or equal role');
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
