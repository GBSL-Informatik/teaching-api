import { StudentGroup as DbStudentGroup } from '@prisma/client';
import { RequestHandler } from 'express';
import Logger from '../utils/logger';
import StudentGroup from '../models/StudentGroup';

export const find: RequestHandler<{ id: string }> = async (req, res, next) => {
    try {
        const group = await StudentGroup.findModel(req.params.id);
        res.json(group);
    } catch (error) {
        next(error);
    }
};

export const create: RequestHandler<any, any, DbStudentGroup> = async (req, res, next) => {
    try {
        Logger.info(req.body);
        const { name, description, parentId } = req.body;
        const model = await StudentGroup.createModel(name, description, parentId);
        res.status(200).json(model);
    } catch (error) {
        next(error);
    }
};

export const update: RequestHandler<{ id: string }, any, { data: DbStudentGroup }> = async (
    req,
    res,
    next
) => {
    try {
        const model = await StudentGroup.updateModel(req.user!, req.params.id, req.body.data);
        res.status(200).json(model);
    } catch (error) {
        next(error);
    }
};

export const setAdminRole: RequestHandler<{ id: string; userId: string }, any, { isAdmin: boolean }> = async (
    req,
    res,
    next
) => {
    try {
        const model = await StudentGroup.setAdminRole(
            req.user!,
            req.params.id,
            req.params.userId,
            req.body.isAdmin
        );
        res.status(200).json(model);
    } catch (error) {
        next(error);
    }
};

export const addUser: RequestHandler<{ id: string; userId: string }, any, any> = async (req, res, next) => {
    try {
        const model = await StudentGroup.addUser(req.user!, req.params.id, req.params.userId);
        res.status(200).json(model);
    } catch (error) {
        next(error);
    }
};

export const removeUser: RequestHandler<{ id: string; userId: string }, any, any> = async (
    req,
    res,
    next
) => {
    try {
        const model = await StudentGroup.removeUser(req.user!, req.params.id, req.params.userId);
        res.status(200).json(model);
    } catch (error) {
        next(error);
    }
};

export const all: RequestHandler = async (req, res, next) => {
    try {
        const users = await StudentGroup.all(req.user!);
        res.json(users);
    } catch (error) {
        next(error);
    }
};

export const destroy: RequestHandler<{ id: string }> = async (req, res, next) => {
    try {
        const group = await StudentGroup.deleteModel(req.user!, req.params.id);
        res.json(group);
    } catch (error) {
        next(error);
    }
};
