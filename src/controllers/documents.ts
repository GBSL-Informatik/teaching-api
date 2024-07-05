import { Document as DbDocument } from '@prisma/client';
import { RequestHandler } from 'express';
import Document from '../models/Document';
import { JsonObject } from '@prisma/client/runtime/library';

export const find: RequestHandler<{ id: string }> = async (req, res, next) => {
    try {
        const document = await Document.findModel(req.user!, req.params.id);
        res.json(document);
    } catch (error) {
        next(error);
    }
};

export const create: RequestHandler<any, any, DbDocument> = async (req, res, next) => {
    try {
        const { type, documentRootId, data, parentId } = req.body;
        const model = await Document.createModel(req.user!, type, documentRootId, data, parentId ? parentId : undefined);
        res.status(200).json(model);
    } catch (error) {
        next(error);
    }
};

export const update: RequestHandler<{ id: string }, any, { data: JsonObject }> = async (req, res, next) => {
    try {
        const model = await Document.updateModel(req.user!, req.params.id, req.body.data);
        res.status(200).json(model);
    } catch (error) {
        next(error);
    }
};

export const all: RequestHandler = async (req, res, next) => {
    try {
        const documents = await Document.all(req.user!);
        res.json(documents);
    } catch (error) {
        next(error);
    }
};

export const destroy: RequestHandler<{ id: string }> = async (req, res, next) => {
    try {
        const document = await Document.deleteModel(req.user!, req.params.id);
        res.json(document);
    } catch (error) {
        next(error);
    }
};
