import { Access } from '../../prisma/generated/client.js';
import { RequestHandler } from 'express';
import RootGroupPermission from '../models/RootGroupPermission.js';
import { HTTP400Error } from '../utils/errors/Errors.js';
import { IoEvent, RecordType } from '../routes/socketEventTypes.js';

export const create: RequestHandler<
    any,
    any,
    { documentRootId: string; groupId: string; access: Access }
> = async (req, res, next) => {
    const { documentRootId, groupId, access } = req.body;

    if (!(documentRootId && groupId && access)) {
        throw new HTTP400Error('Missing documentRootId, groupId or access');
    }

    const model = await RootGroupPermission.createModel((req as any).user!, documentRootId, groupId, access);

    res.notifications = [
        {
            event: IoEvent.NEW_RECORD,
            message: { type: RecordType.GroupPermission, record: model },
            to: model.groupId
        }
    ];
    res.status(200).json(model);
};

export const update: RequestHandler<{ id: string }, any, { access: Access }> = async (req, res, next) => {
    const model = await RootGroupPermission.updateModel((req as any).user!, req.params.id, req.body.access);

    res.notifications = [
        {
            event: IoEvent.CHANGED_RECORD,
            message: { type: RecordType.GroupPermission, record: model },
            to: model.groupId
        }
    ];
    res.status(200).send(model);
};

export const destroy: RequestHandler<{ id: string }> = async (req, res, next) => {
    const model = await RootGroupPermission.deleteModel((req as any).user!, req.params.id);

    res.notifications = [
        {
            event: IoEvent.DELETED_RECORD,
            message: { type: RecordType.GroupPermission, id: model.id },
            to: model.groupId
        }
    ];
    res.json(model);
};
