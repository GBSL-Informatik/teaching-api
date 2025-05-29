import { RequestHandler } from 'express';
import SignupToken from '../models/SignupToken';

export const find: RequestHandler<{ id: string }> = async (req, res, next) => {
    try {
        const document = await SignupToken.findModel(req.params.id, req.user);
        res.json(document);
    } catch (error) {
        next(error);
    }
};

export const all: RequestHandler = async (req, res, next) => {
    try {
        const users = await SignupToken.all(req.user!);
        res.json(users);
    } catch (error) {
        next(error);
    }
};
