import { Document as DbDocument, Prisma, Role } from '@prisma/client';
import { RequestHandler } from 'express';
import Document from '../models/Document';
import { JsonObject } from '@prisma/client/runtime/library';
import { ChangedDocument, IoEvent, RecordType } from '../routes/socketEventTypes';
import { IoRoom } from '../routes/socketEvents';
import { NoneAccess, RO_RW_DocumentRootAccess, RWAccess } from '../helpers/accessPolicy';
import prisma from '../prisma';
import { HTTP403Error, HTTP404Error } from '../utils/errors/Errors';
import { hasElevatedAccess } from '../models/User';

export const find: RequestHandler<{ id: string }> = async (req, res, next) => {
    try {
        const document = await Document.findModel(req.user!, req.params.id);
        res.json(document);
    } catch (error) {
        next(error);
    }
};

export const create: RequestHandler<
    any,
    any,
    DbDocument,
    { onBehalfOf?: 'true'; uniqueMain?: 'true' }
> = async (req, res, next) => {
    try {
        const { type, documentRootId, data, parentId } = req.body;
        const { onBehalfOf, uniqueMain } = req.query;
        const elevatedAccess = hasElevatedAccess(req.user?.role);
        const onBehalfUserId = onBehalfOf === 'true' && elevatedAccess ? req.body.authorId : undefined;
        if (onBehalfUserId && req.user!.role !== Role.ADMIN) {
            const onBehalfOfUser = await prisma.user.findUnique({
                where: {
                    id: onBehalfUserId,
                    studentGroups: {
                        some: {
                            userId: req.user!.id,
                            isAdmin: true
                        }
                    }
                }
            });
            if (!onBehalfOfUser) {
                throw new HTTP403Error('Not allowed to create on behalf of this user');
            }
        }
        const { model, permissions } = await Document.createModel(
            req.user!,
            type,
            documentRootId,
            data,
            !parentId ? undefined : parentId,
            uniqueMain === 'true',
            onBehalfUserId
        );
        /**
         * Notifications to
         * - the user who created the document
         * - users with ro/rw access to the document root
         * - student groups with ro/rw access to the document root
         */
        const groupIds = permissions.group.filter((p) => !NoneAccess.has(p.access)).map((p) => p.groupId);
        const userIds = permissions.user.filter((p) => !NoneAccess.has(p.access)).map((p) => p.userId);
        const sharedAccess = RO_RW_DocumentRootAccess.has(permissions.sharedAccess)
            ? IoRoom.ALL
            : IoRoom.ADMIN;
        res.notifications = [
            {
                event: IoEvent.NEW_RECORD,
                message: { type: RecordType.Document, record: model },
                to: [...groupIds, ...userIds, sharedAccess, req.user!.id] // overlappings are handled by socket.io: https://socket.io/docs/v3/rooms/#joining-and-leaving,
            }
        ];
        res.status(200).json(model);
    } catch (error) {
        next(error);
    }
};

export const update: RequestHandler<
    { id: string },
    any,
    { data: JsonObject },
    { onBehalfOf?: 'true' }
> = async (req, res, next) => {
    try {
        const { onBehalfOf } = req.query;
        const model = await Document.updateModel(
            req.user!,
            req.params.id,
            req.body.data,
            onBehalfOf === 'true'
        );
        /**
         * Notifications to
         * - the user who updated the document
         * - users with ro/rw access to the document root
         * - student groups with ro/rw access to the document root
         */
        const change: ChangedDocument = {
            id: model.id,
            data: model.data,
            updatedAt: model.updatedAt
        };
        const groupIds = model.documentRoot.rootGroupPermissions
            .filter((p) => !NoneAccess.has(p.access))
            .map((p) => p.studentGroupId);
        const userIds = model.documentRoot.rootUserPermissions
            .filter((p) => !NoneAccess.has(p.access))
            .map((p) => p.userId);
        const sharedAccess = RO_RW_DocumentRootAccess.has(model.documentRoot.sharedAccess)
            ? [IoRoom.ALL]
            : [];

        res.notifications = [
            {
                event: IoEvent.CHANGED_DOCUMENT,
                message: change,
                to: [...groupIds, ...sharedAccess, ...userIds, IoRoom.ADMIN, req.user!.id] // overlappings are handled by socket.io: https://socket.io/docs/v3/rooms/#joining-and-leaving
            }
        ];

        res.status(204).send();
    } catch (error) {
        next(error);
    }
};

const childrenSql = (parentId: string) => {
    return Prisma.sql`
        WITH RECURSIVE tree as (
            -- start with the requested event
            SELECT *
            FROM documents
            WHERE id = ${parentId}::uuid
            
            UNION
            -- recursively select all descendants
            SELECT d.*
            FROM documents d
            INNER JOIN tree
            ON d.parent_id=tree.id
        ) -- get first ancestor 
        SELECT * FROM tree WHERE parent_id IS NOT NULL;
    `;
};

export const linkTo: RequestHandler<{ id: string; parentId: string }, any, any> = async (req, res, next) => {
    try {
        if (req.params.id === req.params.parentId) {
            throw new HTTP403Error('Not allowed to link to self');
        }
        const current = await Document.findModel(req.user!, req.params.id);
        if (!current || !RWAccess.has(current.highestPermission)) {
            throw new HTTP404Error('Model not found');
        }
        const children = await prisma.$queryRaw<DbDocument[]>(childrenSql(current.document.id));
        if (children.some((c) => c.id === req.params.parentId)) {
            throw new HTTP403Error(
                "No circular links allowed (trying to link a document to one of it's children)"
            );
        }
        const linkTo = await Document.findModel(req.user!, req.params.parentId);
        if (!linkTo || NoneAccess.has(linkTo.highestPermission)) {
            throw new HTTP404Error('Model linking to not found');
        }
        if (linkTo.document.authorId !== current.document.authorId) {
            throw new HTTP403Error('Not allowed to relink a model to anothers document');
        }
        const allowedAction = await prisma.allowedAction.findFirst({
            where: {
                action: 'update@parent_id',
                documentType: current?.document.type
            }
        });
        if (!allowedAction) {
            throw new HTTP403Error('Not allowed to relink this model');
        }
        const updated = await prisma.document.update({
            where: {
                id: current.document.id
            },
            data: {
                parent: {
                    connect: { id: linkTo.document.id }
                }
            },
            include: {
                documentRoot: {
                    include: {
                        rootGroupPermissions: {
                            select: {
                                access: true,
                                studentGroupId: true
                            }
                        },
                        rootUserPermissions: {
                            select: {
                                access: true,
                                userId: true
                            }
                        }
                    }
                }
            }
        });
        /**
         * Notifications to
         * - the user who updated the document
         * - users with ro/rw access to the document root
         * - student groups with ro/rw access to the document root
         */

        const groupIds = updated.documentRoot.rootGroupPermissions
            .filter((p) => !NoneAccess.has(p.access))
            .map((p) => p.studentGroupId);
        const userIds = updated.documentRoot.rootUserPermissions
            .filter((p) => !NoneAccess.has(p.access))
            .map((p) => p.userId);
        const sharedAccess = RO_RW_DocumentRootAccess.has(updated.documentRoot.sharedAccess)
            ? [IoRoom.ALL]
            : [];

        delete (updated as any).documentRoot;
        res.notifications = [
            {
                event: IoEvent.CHANGED_RECORD,
                message: {
                    type: RecordType.Document,
                    record: updated
                },
                to: [...groupIds, ...sharedAccess, ...userIds, IoRoom.ADMIN, req.user!.id] // overlappings are handled by socket.io: https://socket.io/docs/v3/rooms/#joining-and-leaving
            }
        ];

        res.status(200).json(updated);
    } catch (error) {
        next(error);
    }
};

export const destroy: RequestHandler<{ id: string }> = async (req, res, next) => {
    try {
        const model = await Document.deleteModel(req.user!, req.params.id);

        const groupIds = model.documentRoot.rootGroupPermissions
            .filter((p) => !NoneAccess.has(p.access))
            .map((p) => p.studentGroupId);
        const userIds = model.documentRoot.rootUserPermissions
            .filter((p) => !NoneAccess.has(p.access))
            .map((p) => p.userId);
        const sharedAccess = RO_RW_DocumentRootAccess.has(model.documentRoot.sharedAccess)
            ? [IoRoom.ALL]
            : [];
        res.notifications = [
            {
                event: IoEvent.DELETED_RECORD,
                message: { type: RecordType.Document, id: model.id },
                to: [...groupIds, ...userIds, ...sharedAccess, IoRoom.ADMIN, req.user!.id] // overlappings are handled by socket.io: https://socket.io/docs/v3/rooms/#joining-and-leaving
            }
        ];
        res.status(204).send();
    } catch (error) {
        next(error);
    }
};
