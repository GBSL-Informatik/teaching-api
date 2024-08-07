import {Access} from '@prisma/client';
import {RequestHandler} from 'express';
import RootUserPermission from '../models/RootUserPermission';
import {HTTP400Error} from '../utils/errors/Errors';
import {IoEvent, RecordType} from '../routes/socketEventTypes';

export const create: RequestHandler<
    any,
    any,
    { documentRootId: string; userId: string; access: Access }
> = async (req, res, next) => {
    try {
        const { documentRootId, userId, access } = req.body;

        if (!(documentRootId && userId && access)) {
            throw new HTTP400Error('Missing documentRootId, userId or access');
        }

        const model = await RootUserPermission.createModel(documentRootId, userId, access);

        res.notifications = [
            {
                event: IoEvent.NEW_RECORD,
                message: { type: RecordType.UserPermission, record: model },
                to: model.userId
            }
        ];
        res.status(200).json(model);
    } catch (error) {
        next(error);
    }
};

export const update: RequestHandler<{ id: string }, any, { access: Access }> = async (req, res, next) => {
    try {
        const model = await RootUserPermission.updateModel(req.params.id, req.body.access);

        res.notifications = [
            {
                event: IoEvent.CHANGED_RECORD,
                message: { type: RecordType.UserPermission, record: model },
                to: model.userId
            }
        ];
        res.status(200).send(model);
    } catch (error) {
        next(error);
    }
};

export const destroy: RequestHandler<{ id: string }> = async (req, res, next) => {
    try {
        const model = await RootUserPermission.deleteModel(req.params.id);

        res.notifications = [
            {
                event: IoEvent.DELETED_RECORD,
                message: { type: RecordType.UserPermission, id: model.id },
                to: model.userId
            }
        ];
        res.json(model);
    } catch (error) {
        next(error);
    }
};
