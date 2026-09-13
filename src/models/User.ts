import { Session } from 'better-auth';
import { User as DbUser, Prisma, PrismaClient } from '../../prisma/generated/client.js';
import { createDataExtractor } from '../helpers/dataExtractor.js';
import prisma from '../prisma.js';
import { HTTP403Error, HTTP404Error } from '../utils/errors/Errors.js';
const getData = createDataExtractor<Prisma.UserUncheckedUpdateInput>(['firstName', 'lastName']);

export enum Role {
    STUDENT = 'student',
    TEACHER = 'teacher',
    ADMIN = 'admin'
}

const RoleAccessLevel: { [key in Role]: number } = { [Role.STUDENT]: 0, [Role.TEACHER]: 1, [Role.ADMIN]: 2 };

export const getAccessLevel = (role?: Role | null) => {
    if (!role) {
        return 0;
    }
    return RoleAccessLevel[role] || 0;
};

export const hasElevatedAccess = (role?: string | null) => {
    if (!role) {
        return false;
    }
    return RoleAccessLevel[role as Role] > 0;
};

export const whereStudentGroupAccess = (userId: string, isAdmin?: boolean) => ({
    studentGroups: {
        some: { studentGroup: { users: { some: isAdmin === undefined ? { userId } : { userId, isAdmin } } } }
    }
});

export type ApiUser = DbUser & { authProviders?: string[]; sessions: Omit<Session, 'token' | 'userId'>[] };

const prepareSession = (session: Session): Omit<Session, 'token' | 'userId'> => {
    const { token, userId, ...rest } = session;
    return rest;
};

const prepareUser = (
    user: (DbUser & { accounts: { providerId: string }[]; sessions: Session[] }) | null | undefined,
    includeAuthProvidersFor?: string
): ApiUser | null => {
    if (!user) {
        return null;
    }
    if (!includeAuthProvidersFor || user.id === includeAuthProvidersFor) {
        (user as unknown as ApiUser).authProviders = (user.accounts || []).map((a) => a.providerId);
    }
    if (user.sessions && user.sessions.length > 0) {
        (user as unknown as ApiUser).sessions = user.sessions.map(prepareSession);
    } else {
        (user as unknown as ApiUser).sessions = [];
    }
    delete (user as any).accounts;
    return user;
};

const prepareUsers = (
    users: (DbUser & { accounts: { providerId: string }[]; sessions: Session[] })[] | null | undefined
): ApiUser[] => {
    return users?.filter((u) => !!u).map((u) => prepareUser(u)!) || [];
};

function User(db: PrismaClient['user']) {
    return Object.assign(db, {
        async findModel(id: string): Promise<ApiUser | null> {
            return db
                .findUnique({
                    where: { id },
                    include: {
                        accounts: { select: { providerId: true } },
                        sessions: { take: 1, orderBy: { createdAt: 'desc' } }
                    }
                })
                .then(prepareUser);
        },

        async updateModel(actor: DbUser, id: string, data: Partial<DbUser>): Promise<ApiUser> {
            const record = await db.findUnique({ where: { id: id } });
            if (!record) {
                throw new HTTP404Error('User not found');
            }
            const elevatedAccess = hasElevatedAccess(actor.role);
            if (!(record.id === actor.id || elevatedAccess)) {
                throw new HTTP403Error('Not authorized');
            }
            if (data.role && data.role !== record.role) {
                await this.setRole(actor, id, data.role as Role);
            }
            /** remove fields not updatable*/
            const sanitized = getData(data, false, record.id === actor.id ? false : elevatedAccess);
            return db
                .update({
                    where: { id: id },
                    data: sanitized,
                    include: {
                        accounts: { select: { providerId: true } },
                        sessions: { take: 1, orderBy: { createdAt: 'desc' } }
                    }
                })
                .then((u) => prepareUser(u)!);
        },

        async all(actor: DbUser): Promise<ApiUser[]> {
            if (hasElevatedAccess(actor.role)) {
                /**
                 * Admins and teachers can see all users.
                 * Reason: teachers need to add new users to their student groups
                 */
                return db
                    .findMany({
                        include: {
                            accounts: { select: { providerId: true } },
                            sessions: { take: 1, orderBy: { createdAt: 'desc' } }
                        }
                    })
                    .then(prepareUsers);
            }
            const users = await db.findMany({
                where: { OR: [{ id: actor.id }, whereStudentGroupAccess(actor.id)] },
                include: {
                    accounts: { select: { providerId: true } },
                    sessions: { take: 1, orderBy: { createdAt: 'desc' } }
                },
                distinct: ['id']
            });
            return users.filter((u) => !!u).map((u) => prepareUser(u, actor.id)!);
        },

        async setRole(actor: DbUser, userId: string, role: Role): Promise<ApiUser> {
            if (!hasElevatedAccess(actor.role)) {
                throw new HTTP403Error('Not authorized');
            }
            const actorLevel = RoleAccessLevel[actor.role as Role];
            const roleLevel = RoleAccessLevel[role as Role];
            if (actorLevel === undefined || roleLevel === undefined) {
                throw new HTTP403Error('Not allowed to set this role');
            }
            if (roleLevel > actorLevel) {
                throw new HTTP403Error('Not allowed to set a higher role');
            }
            if (actor.id === userId && roleLevel < actorLevel) {
                throw new HTTP403Error('Not allowed to lower own role');
            }
            const record = await this.findModel(userId);
            if (!record) {
                throw new HTTP404Error('User not found');
            }
            const recordLevel = RoleAccessLevel[record.role as Role];
            if (recordLevel === undefined || actorLevel < recordLevel) {
                throw new HTTP403Error('Not allowed to change the role of user with a higher role');
            }
            return db
                .update({
                    where: { id: userId },
                    data: { role: role },
                    include: {
                        accounts: { select: { providerId: true } },
                        sessions: { take: 1, orderBy: { createdAt: 'desc' } }
                    }
                })
                .then((u) => prepareUser(u)!);
        }
    });
}

export default User(prisma.user);
