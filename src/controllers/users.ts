import { User as DbUser, Role } from '@prisma/client';
import { RequestHandler } from 'express';
import User from '../models/User';
import Logger from '../utils/logger';

export const user: RequestHandler = async (req, res) => {
    res.json(req.user);
};

export const find: RequestHandler<{ id: string }> = async (req, res, next) => {
    const user = await User.findModel(req.params.id);
    res.json(user);
};

export const update: RequestHandler<{ id: string }, any, { data: DbUser }> = async (req, res, next) => {
    const model = await User.updateModel(req.user!, req.params.id, req.body.data);
    res.status(200).json(model);
};

export const all: RequestHandler = async (req, res, next) => {
    const users = await User.all(req.user!);
    res.json(users);
};
