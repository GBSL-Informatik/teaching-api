import { RequestHandler } from 'express';
import DocumentRoot, { Config as CreateConfig, UpdateConfig } from '../models/DocumentRoot';
import { ChangedRecord, IoEvent, RecordType } from '../routes/socketEventTypes';
import { IoRoom } from '../routes/socketEvents';
import { HTTP400Error, HTTP403Error } from '../utils/errors/Errors';
import Document from '../models/Document';
import { NoneAccess, RO_RW_DocumentRootAccess } from '../helpers/accessPolicy';
import { hasElevatedAccess } from '../models/User';

export const find: RequestHandler<{ id: string }> = async (req, res, next) => {
    const document = await DocumentRoot.findModel((req as any).user!, req.params.id);
    res.json(document);
};

export const findMany: RequestHandler<any, any, any, { ids: string[] }> = async (req, res, next) => {
    const ids = Array.isArray(req.query.ids) ? req.query.ids : [req.query.ids];
    if (ids.length === 0 || !req.query.ids) {
        return res.json([]);
    }
    const documents = await DocumentRoot.findManyModels((req as any).user!.id, ids);
    res.json(documents);
};

export const findManyFor: RequestHandler<
    { id: string /** userId */ },
    any,
    any,
    { ignoreMissingRoots?: boolean; ids: string[] }
> = async (req, res, next) => {
    if (!req.params.id) {
        throw new HTTP400Error('Missing user id');
    }
    const canLoad = (req as any).user!.id === req.params.id || hasElevatedAccess((req as any).user?.role);
    if (!canLoad) {
        throw new HTTP403Error('Not Authorized');
    }
    const ids = Array.isArray(req.query.ids) ? req.query.ids : [req.query.ids];
    if (ids.length === 0 || !req.query.ids) {
        return res.json([]);
    }
    const documents = await DocumentRoot.findManyModels(req.params.id, ids, !!req.query.ignoreMissingRoots);
    res.json(documents);
};

export const allDocuments: RequestHandler<any, any, any, { rids: string[] }> = async (req, res, next) => {
    if (!hasElevatedAccess((req as any).user!.role)) {
        throw new HTTP403Error('Not Authorized');
    }
    const ids = Array.isArray(req.query.rids) ? req.query.rids : [req.query.rids];
    if (ids.length === 0) {
        return res.json([]);
    }
    const documents = await Document.allOfDocumentRoots((req as any).user!, ids);
    res.json(documents);
};

export const create: RequestHandler<{ id: string }, any, CreateConfig | undefined> = async (
    req,
    res,
    next
) => {
    const documentRoot = await DocumentRoot.createModel(req.params.id, req.body);
    /**
     * Notifications to
     * - the user who created the document
     * - users with ro/rw access to the document root
     * - student groups with ro/rw access to the document root
     */
    const groupIds = documentRoot.groupPermissions
        .filter((p) => !NoneAccess.has(p.access))
        .map((p) => p.groupId);
    const userIds = documentRoot.userPermissions
        .filter((p) => !NoneAccess.has(p.access))
        .map((p) => p.userId);
    const sharedAccess = RO_RW_DocumentRootAccess.has(documentRoot.sharedAccess) ? IoRoom.ALL : IoRoom.ADMIN;
    res.notifications = [
        {
            event: IoEvent.NEW_RECORD,
            message: { type: RecordType.DocumentRoot, record: documentRoot },
            to: [...groupIds, ...userIds, sharedAccess, (req as any).user!.id] // overlappings are handled by socket.io: https://socket.io/docs/v3/rooms/#joining-and-leaving
        }
    ];
    res.json(documentRoot);
};

export const update: RequestHandler<{ id: string }, any, UpdateConfig> = async (req, res, next) => {
    const model = await DocumentRoot.updateModel(req.params.id, req.body);

    /**
     * Notifications to All users since the document root is a global entity.
     * --> even with restricted access, the document root can be seen by all users.
     */
    const change: ChangedRecord<RecordType.DocumentRoot> = {
        type: RecordType.DocumentRoot,
        record: model
    };
    res.notifications = [
        {
            event: IoEvent.CHANGED_RECORD,
            message: change,
            to: [IoRoom.ALL]
        }
    ];

    res.status(204).send();
};

export const permissions: RequestHandler<{ id: string }> = async (req, res, next) => {
    const permissions = await DocumentRoot.getPermissions((req as any).user!, req.params.id);
    res.json(permissions);
};

export const destroy: RequestHandler<{ id: string }> = async (req, res, next) => {
    const model = await DocumentRoot.deleteModel((req as any).user!, req.params.id);

    res.notifications = [
        {
            event: IoEvent.DELETED_RECORD,
            message: { type: RecordType.DocumentRoot, id: model.id },
            to: [
                ...model.rootGroupPermissions.map((p) => p.studentGroupId),
                ...model.rootUserPermissions.map((u) => u.userId),
                RO_RW_DocumentRootAccess.has(model.sharedAccess) ? IoRoom.ALL : IoRoom.ADMIN
            ]
        }
    ];
    res.json(model);
};
