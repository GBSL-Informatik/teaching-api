import { RequestHandler } from 'express';
import { IoEvent, RecordType } from '../routes/socketEventTypes.js';
import { IoRoom } from '../routes/socketEvents.js';
import { Prisma } from '../../prisma/generated/client.js';
import { HTTP403Error } from '../utils/errors/Errors.js';
import prisma from '../prisma.js';
import { auth } from '../auth.js';
import { fromNodeHeaders } from 'better-auth/node';
import User, { hasElevatedAccess } from '../models/User.js';

export const createAllowedAction: RequestHandler<any, any, Prisma.AllowedActionCreateInput> = async (
    req,
    res,
    next
) => {
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
};

export const allowedActions: RequestHandler = async (req, res, next) => {
    const actions = await prisma.allowedAction.findMany({});
    res.json(actions);
};

export const destroyAllowedAction: RequestHandler<{ id: string }> = async (req, res, next) => {
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
};

export const linkUserPassword: RequestHandler<{ id: string }, any, { pw: string }> = async (
    req,
    res,
    next
) => {
    if (!hasElevatedAccess(req.user?.role)) {
        throw new HTTP403Error('cannot link password to elevated user');
    }
    const user = await prisma.user.findUnique({
        where: { id: req.params.id },
        include: { accounts: true }
    });
    if (!user) {
        throw new HTTP403Error('unknown user');
    }
    if (user.accounts.some((a) => a.providerId === 'credential' && !!a.password)) {
        throw new HTTP403Error('user already has email-password account');
    }
    const account = await prisma.account.create({
        data: {
            providerId: 'credential',
            accountId: user.id,
            user: { connect: { id: user.id } }
        }
    });
    const data = await auth.api.setUserPassword({
        body: {
            newPassword: req.body.pw, // required
            userId: user.id // required
        },
        headers: fromNodeHeaders(req.headers)
    });
    if (!data.status) {
        await prisma.account.delete({
            where: { id: account.id }
        });
        throw new HTTP403Error('could not set password');
    }
    res.status(201).send();
};

export const revokeUserPassword: RequestHandler<{ id: string }> = async (req, res, next) => {
    if (!hasElevatedAccess(req.user?.role)) {
        throw new HTTP403Error('cannot revoke password from elevated user');
    }
    const user = await prisma.user.findUnique({
        where: { id: req.params.id },
        include: { accounts: true }
    });
    if (!user) {
        return res.status(204).send();
    }
    if (user.accounts.length === 1 && user.accounts[0].providerId === 'credential') {
        throw new HTTP403Error('cannot revoke only login method of user');
    }
    const toDelete = user.accounts.filter((a) => a.providerId === 'credential');
    if (toDelete.length === 0) {
        return res.status(204).send();
    }
    await prisma.account.deleteMany({
        where: { id: { in: toDelete.map((a) => a.id) } }
    });
    const updated = await User.findModel(req.params.id);
    if (updated) {
        res.notifications = [
            {
                event: IoEvent.CHANGED_RECORD,
                message: { type: RecordType.User, record: updated },
                to: [IoRoom.ADMIN, user.id],
                toSelf: true
            }
        ];
    }
    res.status(204).send();
};
