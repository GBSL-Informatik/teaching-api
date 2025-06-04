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

export const create: RequestHandler = async (req, res, next) => {
    try {
        const { method, description, validThrough, maxUses, disabled } = req.body;
        const document = await SignupToken.createModel(
            req.user!,
            method,
            description,
            validThrough,
            maxUses,
            disabled
        );
        res.status(200).json(document);
    } catch (error) {
        next(error);
    }
};

export const update: RequestHandler<{ id: string }> = async (req, res, next) => {
    try {
        const updatedDocument = await SignupToken.updateModel(req.user!, req.body, req.params.id);
        res.json(updatedDocument);
    } catch (error) {
        next(error);
    }
};

export const destroy: RequestHandler<{ id: string }> = async (req, res, next) => {
    try {
        await SignupToken.deleteModel(req.user!, req.params.id);
        res.status(204).send();
    } catch (error) {
        next(error);
    }
};
