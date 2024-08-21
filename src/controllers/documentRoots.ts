import { RequestHandler } from 'express';
import DocumentRoot, { Config as CreateConfig, UpdateConfig } from '../models/DocumentRoot';
import { ChangedRecord, IoEvent, RecordType } from '../routes/socketEventTypes';
import { Access } from '@prisma/client';
import { IoRoom } from '../routes/socketEvents';
import { HTTP400Error, HTTP403Error } from '../utils/errors/Errors';

export const find: RequestHandler<{ id: string }> = async (req, res, next) => {
    try {
        const document = await DocumentRoot.findModel(req.user!, req.params.id);
        res.json(document);
    } catch (error) {
        next(error);
    }
};

export const findMany: RequestHandler<any, any, any, { ids: string[] }> = async (req, res, next) => {
    try {
        const ids = Array.isArray(req.query.ids) ? req.query.ids : [req.query.ids];
        if (ids.length === 0) {
            return res.json([]);
        }
        const documents = await DocumentRoot.findManyModels(req.user!.id, ids);
        res.json(documents);
    } catch (error) {
        next(error);
    }
};

export const findManyFor: RequestHandler<
    { id: string },
    any,
    any,
    { ignoreMissingRoots?: boolean; ids: string[] }
> = async (req, res, next) => {
    try {
        if (!req.params.id) {
            throw new HTTP400Error('Missing user id');
        }
        const canLoad = req.user!.id === req.params.id || req.user?.isAdmin;
        if (!canLoad) {
            throw new HTTP403Error('Not Authorized');
        }
        const ids = Array.isArray(req.query.ids) ? req.query.ids : [req.query.ids];
        if (ids.length === 0) {
            return res.json([]);
        }
        const documents = await DocumentRoot.findManyModels(
            req.params.id,
            ids,
            !!req.query.ignoreMissingRoots
        );
        res.json(documents);
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
         * Notifications to All users since the document root is a global entity.
         * --> even with restricted access, the document root can be seen by all users.
         */
        const change: ChangedRecord<RecordType.DocumentRoot> = {
            type: RecordType.DocumentRoot,
            record: model
        };
        res.notifications = [
            {
                event: IoEvent.CHANGED_RECORD,
                message: change,
                to: [IoRoom.ALL]
            }
        ];

        res.status(204).send();
    } catch (error) {
        next(error);
    }
};

export const permissions: RequestHandler<{ id: string }> = async (req, res, next) => {
    try {
        const permissions = await DocumentRoot.getPermissions(req.user!, req.params.id);
        res.json(permissions);
    } catch (error) {
        next(error);
    }
};
