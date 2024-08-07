import {Access} from '@prisma/client';
import {RequestHandler} from 'express';
import RootUserPermission from '../models/RootUserPermission';
import {HTTP400Error} from "../utils/errors/Errors";
import {RootUserPermission as DbRootUserPermission} from ".prisma/client";
import {ApiUserPermission} from "../models/DocumentRoot";
import {IoEvent, RecordType} from "../routes/socketEventTypes";

const asApiRecord = (dbResult: DbRootUserPermission): ApiUserPermission => {
    return {
        id: dbResult.id,
        userId: dbResult.userId,
        access: dbResult.access,
    };
}

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
        const apiRecord = asApiRecord(model);

        res.notifications = [
            {
                event: IoEvent.NEW_RECORD,
                message: { type: RecordType.UserPermission, record: apiRecord },
                to: model.userId
            }
        ]
        res.status(200).json(apiRecord);
    } catch (error) {
        next(error);
    }
};

export const update: RequestHandler<{ id: string }, any, { access: Access }> = async (req, res, next) => {
    try {
        const model = await RootUserPermission.updateModel(req.params.id, req.body.access);
        const apiRecord = asApiRecord(model);

        res.notifications = [
            {
                event: IoEvent.CHANGED_RECORD,
                message: { type: RecordType.UserPermission, record: apiRecord },
                to: model.userId
            }
        ]
        res.status(200).send(apiRecord);
    } catch (error) {
        next(error);
    }
};

export const destroy: RequestHandler<{ id: string }> = async (req, res, next) => {
    try {
        const model = await RootUserPermission.deleteModel(req.params.id);
        const apiRecord = asApiRecord(model);

        res.notifications = [
            {
                event: IoEvent.DELETED_RECORD,
                message: { type: RecordType.UserPermission, id: model.id },
                to: model.userId
            }
        ]
        res.json(apiRecord);
    } catch (error) {
        next(error);
    }
};
