import { Access } from '@prisma/client';
import { RequestHandler } from 'express';
import RootGroupPermission from '../models/RootGroupPermission';
import { HTTP400Error } from '../utils/errors/Errors';
import { IoEvent, RecordType } from '../routes/socketEventTypes';

export const create: RequestHandler<
    any,
    any,
    { documentRootId: string; groupId: string; access: Access }
> = async (req, res, next) => {
    try {
        const { documentRootId, groupId, access } = req.body;

        if (!(documentRootId && groupId && access)) {
            throw new HTTP400Error('Missing documentRootId, groupId or access');
        }

        const model = await RootGroupPermission.createModel(req.user!, documentRootId, groupId, access);

        res.notifications = [
            {
                event: IoEvent.NEW_RECORD,
                message: { type: RecordType.GroupPermission, record: model },
                to: model.groupId
            }
        ];
        res.status(200).json(model);
    } catch (error) {
        next(error);
    }
};

export const update: RequestHandler<{ id: string }, any, { access: Access }> = async (req, res, next) => {
    try {
        const model = await RootGroupPermission.updateModel(req.user!, req.params.id, req.body.access);

        res.notifications = [
            {
                event: IoEvent.CHANGED_RECORD,
                message: { type: RecordType.GroupPermission, record: model },
                to: model.groupId
            }
        ];
        res.status(200).send(model);
    } catch (error) {
        next(error);
    }
};

export const destroy: RequestHandler<{ id: string }> = async (req, res, next) => {
    try {
        const model = await RootGroupPermission.deleteModel(req.user!, req.params.id);

        res.notifications = [
            {
                event: IoEvent.DELETED_RECORD,
                message: { type: RecordType.GroupPermission, id: model.id },
                to: model.groupId
            }
        ];
        res.json(model);
    } catch (error) {
        next(error);
    }
};
