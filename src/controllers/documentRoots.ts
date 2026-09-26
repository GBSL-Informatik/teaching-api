import { RequestHandler } from 'express';
import { NoneAccess, RO_RW_DocumentRootAccess } from '../helpers/accessPolicy.js';
import Document from '../models/Document.js';
import DocumentRoot, { Config as CreateConfig, UpdateConfig } from '../models/DocumentRoot.js';
import { hasElevatedAccess } from '../models/User.js';
import { ChangedRecord, IoEvent, RecordType } from '../routes/socketEventTypes.js';
import { IoRoom } from '../routes/socketEvents.js';
import { HTTP400Error, HTTP403Error } from '../utils/errors/Errors.js';

export const findMultipleFor: RequestHandler<
    { id: string /** userId */ },
    any,
    { documentRootIds: string[]; ignoreMissingRoots?: boolean; type?: string }
> = async (req, res, next) => {
    if (!req.params.id) {
        throw new HTTP400Error('Missing user id');
    }
    const canLoad = req.user!.id === req.params.id || hasElevatedAccess(req.user?.role);
    if (!canLoad) {
        throw new HTTP403Error('Not Authorized');
    }
    const ids = req.body.documentRootIds;
    if (ids.length === 0) {
        return res.json([]);
    }
    const documents = await DocumentRoot.findManyModels(req.params.id, ids, {
        ignoreMissingRoots: !!req.body.ignoreMissingRoots,
        documentType: req.body.type && (req.body.type as string | undefined)
    });
    res.json(documents);
};

export const multipleDocuments: RequestHandler<
    any,
    any,
    { documentRootIds: string[]; userId?: string }
> = async (req, res, next) => {
    const user = req.user;
    const ids = req.body.documentRootIds;
    if (ids.length === 0) {
        return res.json([]);
    }
    if (!hasElevatedAccess(user.role)) {
        if (req.body.userId && req.body.userId !== user.id) {
            throw new HTTP403Error('Not authorized');
        }
        const documents = await DocumentRoot.findManyModels(user.id, ids, {
            ignoreMissingRoots: false
        });
        return res.json(documents?.flatMap((dr) => dr.documents ?? []) ?? []);
    }
    const documents = await Document.allOfDocumentRoots(user, ids, req.body.userId);
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

export const permissions: RequestHandler<any, any, { documentRootIds: string[] }> = async (
    req,
    res,
    next
) => {
    const permissions = await DocumentRoot.getPermissions((req as any).user!, req.body.documentRootIds);
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
