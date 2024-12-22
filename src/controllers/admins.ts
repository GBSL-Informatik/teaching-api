import { RequestHandler } from 'express';
import { IoEvent, RecordType } from '../routes/socketEventTypes';
import { IoRoom } from '../routes/socketEvents';
import { Prisma } from '@prisma/client';
import { HTTP403Error } from '../utils/errors/Errors';
import prisma from '../prisma';

export const createAllowedAction: RequestHandler<any, any, Prisma.AllowedActionCreateInput> = async (
    req,
    res,
    next
) => {
    try {
        const { action, documentType } = req.body;
        const record = await prisma.allowedAction.create({
            data: {
                action: action,
                documentType: documentType
            }
        });
        res.notifications = [
            {
                event: IoEvent.NEW_RECORD,
                message: { type: RecordType.AllowedAction, record: record },
                to: IoRoom.ADMIN
            }
        ];
        res.status(200).json(record);
    } catch (error) {
        next(error);
    }
};

export const allowedActions: RequestHandler = async (req, res, next) => {
    try {
        const actions = await prisma.allowedAction.findMany({});
        res.json(actions);
    } catch (error) {
        next(error);
    }
};

export const destroyAllowedAction: RequestHandler<{ id: string }> = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!id) {
            throw new HTTP403Error('unknown id');
        }
        const action = await prisma.allowedAction.delete({
            where: {
                id: req.params.id
            }
        });
        res.notifications = [
            {
                event: IoEvent.DELETED_RECORD,
                message: { type: RecordType.Document, id: action.id },
                to: IoRoom.ADMIN
            }
        ];
        res.status(204).send();
    } catch (error) {
        next(error);
    }
};
