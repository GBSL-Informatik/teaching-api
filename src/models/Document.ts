import {Document as DbDocument, PrismaClient, User} from '@prisma/client';
import prisma from '../prisma';
import {HTTP403Error, HTTP404Error} from '../utils/errors/Errors';
import {JsonObject} from '@prisma/client/runtime/library';
import DocumentRoot from "./DocumentRoot";

function Document(db: PrismaClient['document']) {
    return Object.assign(db, {

        async findModel(actor: User, id: string) {
            // TODO: Only return the document, if the user has at least RO access on its root.
            return db.findUnique({
                where: {
                    id: id,
                    authorId: actor.id
                },
                include: {
                    author: {
                        select: {
                            id: true // TODO: don't we have the author_id anyway? Or is this something else?
                        }
                    },
                    children: true
                }
            });
        },

        async createModel(actor: User, type: string, documentRootId: string, data: any, parentId?: string): Promise<DbDocument> {
            // TODO: Create document root if it doesn't exist and the user is admin or has RW access on it.
            const documentRoot = await DocumentRoot.findModel(documentRootId);
            if (!documentRoot) {
                throw new HTTP404Error('Document root not found');
            }
            return db.create({
                data: {
                    type: type,
                    documentRootId: documentRootId,
                    data: data,
                    parentId: parentId,
                    authorId: actor.id
                },
                include: {
                    author: true,
                    children: true
                }
            });
        },

        async updateModel(actor: User, id: string, docData: JsonObject): Promise<DbDocument> {
            // TODO: Only allow updates if the user has RW access on the document's root.
            const record = await this.findModel(actor, id);
            if (!record) {
                throw new HTTP404Error('Document not found');
            }
            const canWrite = record.authorId === actor.id || actor.isAdmin; // TODO: Do we want admins to be able to make changes to non-owned documents?
            if (!canWrite) {
                throw new HTTP403Error('Not authorized');
            }
            /** TODO: remove fields not updatable (id...?) */
            return db.update({
                where: {
                    id: id
                },
                data: {
                    data: docData
                }
            });
        },

        async deleteModel(actor: User, id: string): Promise<DbDocument> {
            // TODO: Only allow deletion if the user has RW access on the document's root.
            const record = await db.findUnique({ where: { id: id } });
            if (!record) {
                throw new HTTP404Error('Document not found');
            }
            if (record.authorId !== actor.id && !actor.isAdmin) {
                throw new HTTP403Error('Not authorized');
            }
            return db.delete({
                where: {
                    id: id
                }
            });
        },

        async all(actor: User): Promise<DbDocument[]> {
            // TODO: Only include documents where the (non-admin) user has at least RO access on the root.
            if (actor.isAdmin) {
                return db.findMany({});
            }
            return db.findMany({
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
