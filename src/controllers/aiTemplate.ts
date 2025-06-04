import { RequestHandler } from 'express';
import AiTemplate from '../models/AiTemplate';
(BigInt.prototype as any).toJSON = function () {
    return this.toString(); // Convert to string for serialization
};
export const all: RequestHandler = async (req, res, next) => {
    try {
        const templates = await AiTemplate.all(req.user!);
        res.json(templates);
    } catch (error) {
        next(error);
    }
};

export const find: RequestHandler<{ id: string }> = async (req, res, next) => {
    try {
        const template = await AiTemplate.findModel(req.user!, req.params.id);
        res.json(template);
    } catch (error) {
        next(error);
    }
};
export const create: RequestHandler<any, any, any> = async (req, res, next) => {
    try {
        const template = await AiTemplate.createModel(req.user!, req.body);
        res.status(201).json(template);
    } catch (error) {
        next(error);
    }
};
export const update: RequestHandler<{ id: string }, any, any> = async (req, res, next) => {
    try {
        const template = await AiTemplate.updateModel(req.user!, req.params.id, req.body);
        res.status(200).json(template);
    } catch (error) {
        next(error);
    }
};
export const destroy: RequestHandler<{ id: string }> = async (req, res, next) => {
    try {
        const template = await AiTemplate.deleteModel(req.user!, req.params.id);
        res.status(200).json(template);
    } catch (error) {
        next(error);
    }
};
