import { User as DbUser, Role } from '@prisma/client';
import { RequestHandler } from 'express';
import User from '../models/User';
import Logger from '../utils/logger';

export const user: RequestHandler = async (req, res) => {
    res.json(req.user);
};

export const find: RequestHandler<{ id: string }> = async (req, res, next) => {
    try {
        const user = await User.findModel(req.params.id);
        res.json(user);
    } catch (error) {
        next(error);
    }
};

export const update: RequestHandler<{ id: string }, any, { data: DbUser }> = async (req, res, next) => {
    try {
        const model = await User.updateModel(req.user!, req.params.id, req.body.data);
        res.status(200).json(model);
    } catch (error) {
        next(error);
    }
};

export const all: RequestHandler = async (req, res, next) => {
    try {
        const users = await User.all(req.user!);
        res.json(users);
    } catch (error) {
        next(error);
    }
};

export const setRole: RequestHandler<{ id: string }, any, { data: { role: Role } }> = async (
    req,
    res,
    next
) => {
    try {
        const user = await User.setRole(req.user!, req.params.id, req.body.data.role);
        res.json(user);
    } catch (error) {
        next(error);
    }
};
