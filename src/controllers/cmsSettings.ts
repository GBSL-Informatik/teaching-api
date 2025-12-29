import { RequestHandler } from 'express';
import CmsSettings from '../models/CmsSetting';
import { ChangedRecord, IoEvent, RecordType } from '../routes/socketEventTypes';
import { CmsSettings as DbCmsSettings } from '../../prisma/generated/client';

export const find: RequestHandler = async (req, res, next) => {
    const settings = await CmsSettings.findModel((req as any).user!);
    res.json(settings);
};

export const update: RequestHandler<any, any, Partial<DbCmsSettings>> = async (req, res, next) => {
    await CmsSettings.updateModel((req as any).user!, req.body);
    res.status(204).send();
};

export const logout: RequestHandler<any, any, Partial<DbCmsSettings>> = async (req, res, next) => {
    const model = await CmsSettings.logout((req as any).user!);
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
            to: [(req as any).user!.id]
        }
    ];

    res.status(204).send();
};

export const githubToken: RequestHandler<any, any, any, { code: string }> = async (req, res, next) => {
    const { code } = req.query;
    const model = await CmsSettings.fetchToken((req as any).user!.id, code);

    const change: ChangedRecord<RecordType.CmsSettings> = {
        type: RecordType.CmsSettings,
        record: model
    };
    res.notifications = [
        {
            event: IoEvent.CHANGED_RECORD,
            message: change,
            to: [(req as any).user!.id]
        }
    ];
    res.status(200).json(model);
};
