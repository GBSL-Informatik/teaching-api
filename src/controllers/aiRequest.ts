import { RequestHandler } from 'express';
import AiRequest from '../models/AiRequest';
import { AiRequest as DbAiRequest } from '@prisma/client';
import { IoRoom } from '../routes/socketEvents';
import { IoEvent, RecordType } from '../routes/socketEventTypes';

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
        const onResponse = (aiRequest: DbAiRequest) => {
            req.io?.to([req.user!.id, IoRoom.ADMIN]).emit(IoEvent.CHANGED_RECORD, {
                type: RecordType.AiRequest,
                record: aiRequest
            });
        };
        const request = await AiRequest.createModel(req.user!, req.params.id, req.body.request, onResponse);
        res.status(201).json(request);
    } catch (error) {
        next(error);
    }
};
