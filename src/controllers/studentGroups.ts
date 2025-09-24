import { StudentGroup as DbStudentGroup } from '@prisma/client';
import { RequestHandler } from 'express';
import StudentGroup from '../models/StudentGroup';
import { IoEvent, RecordType } from '../routes/socketEventTypes';

export const find: RequestHandler<{ id: string }> = async (req, res, next) => {
    const group = await StudentGroup.findModel(req.user!, req.params.id);
    res.json(group);
};

export const create: RequestHandler<any, any, DbStudentGroup> = async (req, res, next) => {
    const { name, description, parentId } = req.body;
    const model = await StudentGroup.createModel(req.user!, name, description, parentId);
    res.status(200).json(model);
};

export const update: RequestHandler<{ id: string }, any, { data: DbStudentGroup }> = async (
    req,
    res,
    next
) => {
    const model = await StudentGroup.updateModel(req.user!, req.params.id, req.body.data);
    if (!model) {
        return res.status(404).json({ message: 'Student group not found' });
    }

    res.notifications = [
        {
            event: IoEvent.CHANGED_RECORD,
            message: {
                type: RecordType.StudentGroup,
                record: model
            },
            to: [model.id] // overlappings are handled by socket.io: https://socket.io/docs/v3/rooms/#joining-and-leaving
        }
    ];
    res.status(200).json(model);
};

export const setAdminRole: RequestHandler<{ id: string; userId: string }, any, { isAdmin: boolean }> = async (
    req,
    res,
    next
) => {
    const model = await StudentGroup.setAdminRole(
        req.user!,
        req.params.id,
        req.params.userId,
        req.body.isAdmin
    );
    res.notifications = [
        {
            event: IoEvent.CHANGED_RECORD,
            message: {
                type: RecordType.StudentGroup,
                record: model
            },
            to: [model.id] // overlappings are handled by socket.io: https://socket.io/docs/v3/rooms/#joining-and-leaving
        }
    ];
    res.status(200).json(model);
};

export const addUser: RequestHandler<{ id: string; userId: string }, any, any> = async (req, res, next) => {
    const model = await StudentGroup.addUser(req.user!, req.params.id, req.params.userId);
    res.notifications = [
        {
            event: IoEvent.CHANGED_RECORD,
            message: {
                type: RecordType.StudentGroup,
                record: model
            },
            to: [model.id] // overlappings are handled by socket.io: https://socket.io/docs/v3/rooms/#joining-and-leaving
        },
        {
            event: IoEvent.NEW_RECORD,
            message: {
                type: RecordType.StudentGroup,
                record: model
            },
            to: [req.params.userId] // overlappings are handled by socket.io: https://socket.io/docs/v3/rooms/#joining-and-leaving
        }
    ];
    res.status(200).json(model);
};

export const removeUser: RequestHandler<{ id: string; userId: string }, any, any> = async (
    req,
    res,
    next
) => {
    const model = await StudentGroup.removeUser(req.user!, req.params.id, req.params.userId);
    res.notifications = [
        {
            event: IoEvent.CHANGED_RECORD,
            message: {
                type: RecordType.StudentGroup,
                record: model
            },
            to: [req.params.userId, model.id] // overlappings are handled by socket.io: https://socket.io/docs/v3/rooms/#joining-and-leaving
        },
        {
            event: IoEvent.DELETED_RECORD,
            message: {
                type: RecordType.StudentGroup,
                id: model.id
            },
            to: [req.params.userId] // overlappings are handled by socket.io: https://socket.io/docs/v3/rooms/#joining-and-leaving
        }
    ];
    res.status(200).json(model);
};

export const all: RequestHandler = async (req, res, next) => {
    const users = await StudentGroup.all(req.user!);
    res.json(users);
};

export const destroy: RequestHandler<{ id: string }> = async (req, res, next) => {
    const group = await StudentGroup.deleteModel(req.user!, req.params.id);
    res.notifications = [
        {
            event: IoEvent.DELETED_RECORD,
            message: {
                type: RecordType.StudentGroup,
                id: group.id
            },
            to: [group.id] // overlappings are handled by socket.io: https://socket.io/docs/v3/rooms/#joining-and-leaving
        }
    ];
    res.json(group);
};
