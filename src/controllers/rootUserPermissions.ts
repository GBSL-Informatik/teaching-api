import { Access } from '../../prisma/generated/client';
import { RequestHandler } from 'express';
import RootUserPermission from '../models/RootUserPermission';
import { HTTP400Error } from '../utils/errors/Errors';
import { IoEvent, RecordType } from '../routes/socketEventTypes';
import { IoRoom } from '../routes/socketEvents';

export const create: RequestHandler<
    any,
    any,
    { documentRootId: string; userId: string; access: Access }
> = async (req, res, next) => {
    const { documentRootId, userId, access } = req.body;

    if (!(documentRootId && userId && access)) {
        throw new HTTP400Error('Missing documentRootId, userId or access');
    }

    const model = await RootUserPermission.createModel((req as any).user!, documentRootId, userId, access);

    res.notifications = [
        {
            event: IoEvent.NEW_RECORD,
            message: { type: RecordType.UserPermission, record: model },
            to: [model.userId, IoRoom.ADMIN]
        }
    ];
    res.status(200).json(model);
};

export const update: RequestHandler<{ id: string }, any, { access: Access }> = async (req, res, next) => {
    if (!req.params.id) {
        throw new HTTP400Error('Missing id');
    }
    const model = await RootUserPermission.updateModel((req as any).user!, req.params.id, req.body.access);

    res.notifications = [
        {
            event: IoEvent.CHANGED_RECORD,
            message: { type: RecordType.UserPermission, record: model },
            to: [model.userId, IoRoom.ADMIN]
        }
    ];
    res.status(200).send(model);
};

export const destroy: RequestHandler<{ id: string }> = async (req, res, next) => {
    if (!req.params.id) {
        throw new HTTP400Error('Missing id');
    }
    const model = await RootUserPermission.deleteModel((req as any).user!, req.params.id);

    res.notifications = [
        {
            event: IoEvent.DELETED_RECORD,
            message: { type: RecordType.UserPermission, id: model.id },
            to: [model.userId, IoRoom.ADMIN]
        }
    ];
    res.json(model);
};
