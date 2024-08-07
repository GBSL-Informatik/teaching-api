import {Access} from '@prisma/client';
import {RequestHandler} from 'express';
import RootGroupPermission from '../models/RootGroupPermission';
import {HTTP400Error} from "../utils/errors/Errors";
import {IoEvent, RecordType} from "../routes/socketEventTypes";
import {ApiGroupPermission} from "../models/DocumentRoot";
import {RootGroupPermission as DbRootGroupPermission} from "@prisma/client";

const asApiRecord = (dbResult: DbRootGroupPermission): ApiGroupPermission => {
    return {
        id: dbResult.id,
        groupId: dbResult.studentGroupId,
        access: dbResult.access,
    };
}

export const create: RequestHandler<
    any,
    any,
    { documentRootId: string; studentGroupId: string; access: Access }
> = async (req, res, next) => {
    try {
        const { documentRootId, studentGroupId, access } = req.body;

        if (!(documentRootId && studentGroupId && access)) {
            throw new HTTP400Error('Missing documentRootId, studentGroupId or access');
        }

        const model: DbRootGroupPermission = await RootGroupPermission.createModel(documentRootId, studentGroupId, access);
        const apiRecord = asApiRecord(model);

        res.notifications = [
            {
                event: IoEvent.NEW_RECORD,
                message: { type: RecordType.GroupPermission, record: apiRecord },
                to: model.studentGroupId
            }
        ]
        res.status(200).json(apiRecord);
    } catch (error) {
        next(error);
    }
};

export const update: RequestHandler<{ id: string }, any, { access: Access }> = async (req, res, next) => {
    try {
        const model = await RootGroupPermission.updateModel(req.params.id, req.body.access);
        const apiRecord = asApiRecord(model);

        res.notifications = [
            {
                event: IoEvent.CHANGED_RECORD,
                message: { type: RecordType.GroupPermission, record: apiRecord },
                to: model.studentGroupId
            }
        ]
        res.status(200).send(apiRecord);
    } catch (error) {
        next(error);
    }
};

export const destroy: RequestHandler<{ id: string }> = async (req, res, next) => {
    try {
        const model = await RootGroupPermission.deleteModel(req.params.id);
        const apiRecord = asApiRecord(model);

        res.notifications = [
            {
                event: IoEvent.DELETED_RECORD,
                message: { type: RecordType.GroupPermission, id: model.id },
                to: model.studentGroupId
            }
        ]
        res.json(apiRecord);
    } catch (error) {
        next(error);
    }
};
