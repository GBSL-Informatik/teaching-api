import { Role, Group as DbGroup } from '@prisma/client';
import { RequestHandler } from 'express';
import Group from '../models/Group';
import Logger from '../utils/logger';

export const find: RequestHandler<{ id: string }> = async (req, res, next) => {
    try {
        const group = await Group.findModel(req.params.id);
        res.json(group);
    } catch (error) {
        next(error);
    }
};

export const update: RequestHandler<{ id: string }, any, { data: DbGroup }> = async (req, res, next) => {
    Logger.info(req.body)

    try {
        const model = await Group.updateModel(req.user!, req.params.id, req.body.data);
        res.status(200).json(model);
    } catch (error) {
        next(error);
    }
};

export const all: RequestHandler = async (req, res, next) => {
    try {
        const users = await Group.all(req.user!);
        res.json(users);
    } catch (error) {
        next(error);
    }
};

export const destroy: RequestHandler<{ id: string }> = async (req, res, next) => {
    try {
        const group = await Group.deleteModel(req.user!, req.params.id);
        res.json(group);
    } catch (error) {
        next(error);
    }
};