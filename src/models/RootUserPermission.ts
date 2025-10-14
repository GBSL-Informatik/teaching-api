import { Access, PrismaClient } from '@prisma/client';
import prisma from '../prisma';
import { RootUserPermission as DbRootUserPermission, User } from '@prisma/client';
import { asUserAccess } from '../helpers/accessPolicy';
import { hasElevatedAccess, Role, whereStudentGroupAccess } from './User';
import { HTTP403Error, HTTP404Error } from '../utils/errors/Errors';

// TODO: Consider checking existence of documentRoot / user to provide better error messages / exceptions.

export type ApiUserPermission = { id: string; userId: string; access: Access };

const ensureAccessOrThrow = async (actor: User, userId: string) => {
    const user = await prisma.user.findUnique({
        where: { id: userId, ...whereStudentGroupAccess(actor.id, true) }
    });
    if (!user) {
        throw new HTTP403Error('Not authorized');
    }
};

function RootUserPermission(db: PrismaClient['rootUserPermission']) {
    return Object.assign(db, {
        async createModel(
            actor: User,
            documentRootId: string,
            userId: string,
            access: Access
        ): Promise<DbRootUserPermission> {
            if (!hasElevatedAccess(actor.role)) {
                throw new HTTP403Error('Not authorized');
            }
            if (actor.role === Role.TEACHER) {
                await ensureAccessOrThrow(actor, userId);
            }
            const result = await db.create({
                data: { documentRootId: documentRootId, userId: userId, access: asUserAccess(access) }
            });
            return result;
        },

        async updateModel(actor: User, id: string, access: Access): Promise<DbRootUserPermission> {
            if (!hasElevatedAccess(actor.role)) {
                throw new HTTP403Error('Not authorized');
            }
            const record = await db.findUnique({ where: { id: id } });
            if (!record) {
                throw new HTTP404Error('User permission not found');
            }
            if (actor.role === Role.TEACHER) {
                await ensureAccessOrThrow(actor, record.userId);
            }
            const result = await db.update({ where: { id: id }, data: { access: asUserAccess(access) } });
            return result;
        },

        async deleteModel(actor: User, id: string): Promise<ApiUserPermission> {
            if (!hasElevatedAccess(actor.role)) {
                throw new HTTP403Error('Not authorized');
            }
            const record = await db.findUnique({ where: { id: id } });
            if (!record) {
                throw new HTTP404Error('User permission not found');
            }
            if (actor.role === Role.TEACHER) {
                await ensureAccessOrThrow(actor, record.userId);
            }
            const result = await db.delete({ where: { id: id } });
            return result;
        }
    });
}

export default RootUserPermission(prisma.rootUserPermission);
