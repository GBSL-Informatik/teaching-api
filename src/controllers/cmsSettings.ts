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
        await CmsSettings.updateModel(req.user!, req.body);
        res.status(204).send();
    } catch (error) {
        next(error);
    }
};

export const logout: RequestHandler<any, any, Partial<DbCmsSettings>> = async (req, res, next) => {
    try {
        const model = await CmsSettings.logout(req.user!);
        if (!model) {
            res.status(204).send();
            return;
        }
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
        res.status(200).json(model);
    } catch (error) {
        next(error);
    }
};
