import { Access, Document as DbDocument } from '@prisma/client';
import { RequestHandler } from 'express';
import Document from '../models/Document';
import { JsonObject } from '@prisma/client/runtime/library';
import { ChangedDocument, IoEvent, RecordType } from '../routes/socketEventTypes';

export const find: RequestHandler<{ id: string }> = async (req, res, next) => {
    try {
        const document = await Document.findModel(req.user!, req.params.id);
        res.json(document);
    } catch (error) {
        next(error);
    }
};

export const create: RequestHandler<any, any, DbDocument> = async (req, res, next) => {
    try {
        const { type, documentRootId, data, parentId } = req.body;
        const { model, permissions } = await Document.createModel(
            req.user!,
            type,
            documentRootId,
            data,
            !parentId ? undefined : parentId
        );
        /**
         * Notifications to
         * - the user who created the document
         * - users with ro/rw access to the document root
         * - student groups with ro/rw access to the document root
         */
        const groupIds = permissions.group.filter((p) => p.access !== Access.None).map((p) => p.groupId);
        const userIds = permissions.user.filter((p) => p.access !== Access.None).map((p) => p.userId);
        res.notifications = [
            {
                event: IoEvent.NEW_RECORD,
                message: { type: RecordType.Document, record: model },
                to: [...groupIds, ...userIds, req.user!.id] // overlappings are handled by socket.io: https://socket.io/docs/v3/rooms/#joining-and-leaving
            }
        ];
        res.status(200).json(model);
    } catch (error) {
        next(error);
    }
};

export const update: RequestHandler<{ id: string }, any, { data: JsonObject }> = async (req, res, next) => {
    try {
        const model = await Document.updateModel(req.user!, req.params.id, req.body.data);
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
            .filter((p) => p.access !== Access.None)
            .map((p) => p.studentGroupId);
        const userIds = model.documentRoot.rootUserPermissions
            .filter((p) => p.access !== Access.None)
            .map((p) => p.userId);

        res.notifications = [
            {
                event: IoEvent.CHANGED_DOCUMENT,
                message: change,
                to: [...groupIds, ...userIds, req.user!.id] // overlappings are handled by socket.io: https://socket.io/docs/v3/rooms/#joining-and-leaving
            }
        ];

        res.status(204).send();
    } catch (error) {
        next(error);
    }
};

export const all: RequestHandler = async (req, res, next) => {
    try {
        const documents = await Document.all(req.user!);
        res.json(documents);
    } catch (error) {
        next(error);
    }
};

export const destroy: RequestHandler<{ id: string }> = async (req, res, next) => {
    try {
        const document = await Document.deleteModel(req.user!, req.params.id);
        res.json(document);
    } catch (error) {
        next(error);
    }
};
