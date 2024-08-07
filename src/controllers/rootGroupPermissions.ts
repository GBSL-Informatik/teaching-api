import { Access } from '@prisma/client';
import { RequestHandler } from 'express';
import RootGroupPermission from '../models/RootGroupPermission';

export const create: RequestHandler<
    any,
    any,
    { documentRootId: string; studentGroupId: string; access: Access }
> = async (req, res, next) => {
    try {
        const { documentRootId, studentGroupId, access } = req.body;

        if (!(documentRootId && studentGroupId && access)) {
            res.status(400).send('Missing documentRootId, studentGroupId or access');
            return;
        }

        const model = await RootGroupPermission.createModel(documentRootId, studentGroupId, access);

        res.status(200).json(model);
    } catch (error) {
        next(error);
    }
};

export const update: RequestHandler<{ id: string }, any, { access: Access }> = async (req, res, next) => {
    try {
        const model = await RootGroupPermission.updateModel(req.params.id, req.body.access);
        res.status(200).send(model);
    } catch (error) {
        next(error);
    }
};

export const destroy: RequestHandler<{ id: string }> = async (req, res, next) => {
    try {
        const permission = await RootGroupPermission.deleteModel(req.params.id);
        res.json(permission);
    } catch (error) {
        next(error);
    }
};
