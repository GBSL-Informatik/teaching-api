import {Access} from '@prisma/client';
import {RequestHandler} from 'express';
import RootUserPermission from "../models/RootUserPermission";

export const create: RequestHandler<any, any, {documentRootId: string, userId: string, access: Access}> = async (req, res, next) => {
  try {
    const { documentRootId, userId, access } = req.body;

    if (!(documentRootId && userId && access)) {
      res.status(400).send('Missing documentRootId, userId or access');
      return;
    }

    const model = await RootUserPermission.createModel(documentRootId, userId, access);

    res.status(200).json(model);
  } catch (error) {
    next(error);
  }
};

export const update: RequestHandler<{ id: string }, any, { access: Access }> = async (req, res, next) => {
  try {
    const model = await RootUserPermission.updateModel(req.params.id, req.body.access);
    res.status(200).send(model);
  } catch (error) {
    next(error);
  }
};

export const destroy: RequestHandler<{ id: string }> = async (req, res, next) => {
  try {
    const permission = await RootUserPermission.deleteModel(req.params.id);
    res.json(permission);
  } catch (error) {
    next(error);
  }
};
