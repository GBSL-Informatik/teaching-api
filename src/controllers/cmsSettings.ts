import { RequestHandler } from 'express';
import CmsSettings from '../models/CmsSetting';
import { ChangedRecord, IoEvent, RecordType } from '../routes/socketEventTypes';
import { CmsSettings as DbCmsSettings } from '@prisma/client';

export const find: RequestHandler = async (req, res, next) => {
    try {
        const settings = await CmsSettings.findModel(req.user!);
        res.json(settings);
    } catch (error) {
        next(error);
    }
};

export const update: RequestHandler<any, any, Partial<DbCmsSettings>> = async (req, res, next) => {
    try {
        const model = await CmsSettings.updateModel(req.user!, req.body);
        const change: ChangedRecord<RecordType.CmsSettings> = {
            type: RecordType.CmsSettings,
            record: model
        };
        res.notifications = [
            {
                event: IoEvent.CHANGED_RECORD,
                message: change,
                to: [req.user!.id]
            }
        ];

        res.status(204).send();
    } catch (error) {
        next(error);
    }
};

export const githubToken: RequestHandler<any, any, any, { code: string }> = async (req, res, next) => {
    try {
        const { code } = req.query;
        const model = await CmsSettings.fetchToken(req.user!.id, code);
        res.status(200).json(model);
    } catch (error) {
        next(error);
    }
};
