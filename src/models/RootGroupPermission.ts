import {
    Access,
    PrismaClient,
    RootGroupPermission as DbGroupPermission,
    User
} from '../../prisma/generated/client';
import prisma from '../prisma';
import { asGroupAccess } from '../helpers/accessPolicy';
import { hasElevatedAccess, Role } from './User';
import { HTTP403Error, HTTP404Error } from '../utils/errors/Errors';

// TODO: Consider checking existence of documentRoot / studentGroup to provide better error messages / exceptions.

export type ApiGroupPermission = { id: string; groupId: string; access: Access };

export type CompleteApiGroupPermission = {
    id: string;
    groupId: string;
    documentRootId: string;
    access: Access;
};

function asCompleteApiRecord(dbResult: DbGroupPermission): CompleteApiGroupPermission {
    return {
        id: dbResult.id,
        groupId: dbResult.studentGroupId,
        documentRootId: dbResult.documentRootId,
        access: dbResult.access
    };
}
const ensureAccessOrThrow = async (actor: User, groupId: string) => {
    const group = await prisma.studentGroup.findUnique({
        where: { id: groupId, users: { some: { userId: actor.id, isAdmin: true } } }
    });
    if (!group) {
        throw new HTTP403Error('Not authorized');
    }
};

function RootGroupPermission(db: PrismaClient['rootGroupPermission']) {
    return Object.assign(db, {
        async createModel(
            actor: User,
            documentRootId: string,
            studentGroupId: string,
            access: Access
        ): Promise<CompleteApiGroupPermission> {
            if (!hasElevatedAccess(actor.role)) {
                throw new HTTP403Error('Not authorized');
            }
            if (actor.role === Role.TEACHER) {
                await ensureAccessOrThrow(actor, studentGroupId);
            }

            const result = await db.create({
                data: {
                    documentRootId: documentRootId,
                    studentGroupId: studentGroupId,
                    access: asGroupAccess(access)
                }
            });
            return asCompleteApiRecord(result);
        },

        async updateModel(actor: User, id: string, access: Access): Promise<CompleteApiGroupPermission> {
            if (!hasElevatedAccess(actor.role)) {
                throw new HTTP403Error('Not authorized');
            }
            const record = await db.findUnique({ where: { id: id } });
            if (!record) {
                throw new HTTP404Error('Group permission not found');
            }
            if (actor.role === Role.TEACHER) {
                await ensureAccessOrThrow(actor, record.studentGroupId);
            }

            const result = await db.update({ where: { id: id }, data: { access: asGroupAccess(access) } });
            return asCompleteApiRecord(result);
        },

        async deleteModel(actor: User, id: string): Promise<CompleteApiGroupPermission> {
            if (!hasElevatedAccess(actor.role)) {
                throw new HTTP403Error('Not authorized');
            }
            const record = await db.findUnique({ where: { id: id } });
            if (!record) {
                throw new HTTP404Error('Group permission not found');
            }
            if (actor.role === Role.TEACHER) {
                await ensureAccessOrThrow(actor, record.studentGroupId);
            }

            const result = await db.delete({ where: { id: id } });
            return asCompleteApiRecord(result);
        }
    });
}

export default RootGroupPermission(prisma.rootGroupPermission);
