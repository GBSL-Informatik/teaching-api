import { Prisma, PrismaClient, Document as DbDocument, User, Role } from '@prisma/client';
import prisma from '../prisma';
import { HTTP403Error, HTTP404Error } from '../utils/errors/Errors';
import { JsonObject } from '@prisma/client/runtime/library';

function Document(db: PrismaClient['document']) {
    return Object.assign(db, {
        async findModel(id: string): Promise<DbDocument | null> {
            return await db.findUnique({ 
                where: {
                    id: id,
                },
                include: {
                    author: true,
                    children: true
                }
            });
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
            const record = await this.findModel(id);
            if (!record) {
                throw new HTTP404Error('Document not found');
            }
            if (record.authorId !== actor.id && actor.role !== Role.ADMIN) {
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