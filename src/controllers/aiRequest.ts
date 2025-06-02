import { RequestHandler } from 'express';
import AiRequest from '../models/AiRequest';

export const all: RequestHandler<{ aiTemplateId: string }> = async (req, res, next) => {
    try {
        const requests = await AiRequest.all(req.user!, req.params.aiTemplateId);
        res.json(requests);
    } catch (error) {
        next(error);
    }
};

export const find: RequestHandler<{ id: string; requestId: string }> = async (req, res, next) => {
    try {
        const request = await AiRequest.findModel(req.user!, req.params.id, req.params.requestId);
        res.json(request);
    } catch (error) {
        next(error);
    }
};

export const create: RequestHandler<{ id: string }, any, { request: string }> = async (req, res, next) => {
    try {
        const request = await AiRequest.createModel(req.user!, req.params.id, req.body.request);
        res.status(201).json(request);
    } catch (error) {
        next(error);
    }
};
