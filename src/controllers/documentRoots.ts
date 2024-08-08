import { RequestHandler } from 'express';
import DocumentRoot, { Config as CreateConfig, UpdateConfig } from '../models/DocumentRoot';
import { ChangedRecord, IoEvent, RecordType } from '../routes/socketEventTypes';
import { Access } from '@prisma/client';

export const find: RequestHandler<{ id: string }> = async (req, res, next) => {
    try {
        const document = await DocumentRoot.findModel(req.user!, req.params.id);
        res.json(document);
    } catch (error) {
        next(error);
    }
};

export const create: RequestHandler<{ id: string }, any, CreateConfig | undefined> = async (
    req,
    res,
    next
) => {
    try {
        const documentRoot = await DocumentRoot.createModel(req.params.id, req.body);
        res.json(documentRoot);
    } catch (error) {
        next(error);
    }
};

export const update: RequestHandler<{ id: string }, any, UpdateConfig> = async (req, res, next) => {
    try {
        const model = await DocumentRoot.updateModel(req.params.id, req.body);

        /**
         * Notifications to
         * - the (admin) user who updated the document root
         * - users with ro/rw access to the document root
         * - student groups with ro/rw access to the document root
         */
        const change: ChangedRecord<RecordType.DocumentRoot> = {
            type: RecordType.DocumentRoot,
            record: model
        };
        const groupIds = model.groupPermissions.filter((p) => p.access !== Access.None).map((p) => p.groupId);
        const userIds = model.userPermissions.filter((p) => p.access !== Access.None).map((p) => p.userId);

        res.notifications = [
            {
                event: IoEvent.CHANGED_RECORD,
                message: change,
                to: [...groupIds, ...userIds, req.user!.id] // overlappings are handled by socket.io: https://socket.io/docs/v3/rooms/#joining-and-leaving
            }
        ];

        res.status(204).send();
    } catch (error) {
        next(error);
    }
};
