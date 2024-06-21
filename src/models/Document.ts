import { Prisma, PrismaClient, Document as DbDocument, User, Role } from '@prisma/client';
import prisma from '../prisma';
import { HTTP403Error, HTTP404Error } from '../utils/errors/Errors';
import { JsonObject } from '@prisma/client/runtime/library';

const hasWriteAccess = (actor: Role, docRole: Role | null) => {
    if (!docRole) {
        return false;
    }
    switch (docRole) {
        case Role.ADMIN:
            return actor === Role.ADMIN;
        case Role.TEACHER:
            return actor === Role.ADMIN || actor === Role.TEACHER;
        case Role.STUDENT:
            return true;
        default:
            return false;
    }
};

function Document(db: PrismaClient['document']) {
    return Object.assign(db, {
        async findModel(actor: User, id: string) {
            const doc = await db.findUnique({
                where: {
                    id: id,
                    OR: [
                        { authorId: actor.id },
                        {
                            documentGroups: {
                                some: {
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
                    ]
                },
                include: {
                    author: {
                        select: {
                            id: true
                        }
                    },
                    documentGroups: {
                        select: {
                            readAccess: true,
                            writeAccess: true,
                            group: {
                                select: {
                                    users: {
                                        select: {
                                            userId: true,
                                            role: true
                                        }
                                    }
                                }
                            }
                        }
                    },
                    children: true
                }
            });
            return doc;
        },
        async createModel(actor: User, type: string, data: any, parentId?: string): Promise<DbDocument> {
            const record = await db.create({
                data: {
                    type: type,
                    data: data,
                    parentId: parentId,
                    authorId: actor.id
                },
                include: {
                    author: true,
                    children: true
                }
            });
            return record;
        },
        async updateModel(actor: User, id: string, docData: JsonObject): Promise<DbDocument> {
            const record = await this.findModel(actor, id);
            if (!record) {
                throw new HTTP404Error('Document not found');
            }
            const canWrite =
                record.authorId === actor.id ||
                record.documentGroups.some((group) => {
                    return group.group.users.some((user) => {
                        return user.userId === actor.id && hasWriteAccess(user.role, group.writeAccess)
                    });
                });
            if (!canWrite) {
                throw new HTTP403Error('Not authorized');
            }
            /** remove fields not updatable */
            return await db.update({
                where: {
                    id: id
                },
                data: {
                    data: docData
                }
            });
        },
        async deleteModel(actor: User, id: string): Promise<DbDocument> {
            const record = await db.findUnique({ where: { id: id } });
            if (!record) {
                throw new HTTP404Error('Document not found');
            }
            if (record.authorId !== actor.id && actor.role !== Role.ADMIN) {
                throw new HTTP403Error('Not authorized');
            }
            return await db.delete({
                where: {
                    id: id
                }
            });
        },
        async all(actor: User): Promise<DbDocument[]> {
            if (actor.role === Role.ADMIN) {
                return await db.findMany({});
            }
            return await db.findMany({
                where: {
                    authorId: actor.id
                },
                include: {
                    author: true,
                    children: true
                }
            });
        }
    });
}

export default Document(prisma.document);
