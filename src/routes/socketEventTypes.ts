import { AllowedAction, CmsSettings, Prisma, User } from '@prisma/client';
import { ApiDocument } from '../models/Document';
import { ApiUserPermission } from '../models/RootUserPermission';
import { ApiGroupPermission } from '../models/RootGroupPermission';
import { ApiDocumentRootWithoutDocuments } from '../models/DocumentRoot';
import { ApiStudentGroup } from '../models/StudentGroup';

export enum IoEvent {
    NEW_RECORD = 'NEW_RECORD',
    CHANGED_RECORD = 'CHANGED_RECORD',
    CHANGED_DOCUMENT = 'CHANGED_DOCUMENT',
    DELETED_RECORD = 'DELETED_RECORD',
    CONNECTED_CLIENTS = 'CONNECTED_CLIENTS',
    ACTION = 'ACTION'
}

export enum RecordType {
    Document = 'Document',
    User = 'User',
    UserPermission = 'UserPermission',
    GroupPermission = 'GroupPermission',
    DocumentRoot = 'DocumentRoot',
    StudentGroup = 'StudentGroup',
    AllowedAction = 'AllowedAction',
    CmsSettings = 'CmsSettings'
}

type TypeRecordMap = {
    [RecordType.Document]: ApiDocument;
    [RecordType.User]: User;
    [RecordType.UserPermission]: ApiUserPermission;
    [RecordType.GroupPermission]: ApiGroupPermission;
    [RecordType.DocumentRoot]: ApiDocumentRootWithoutDocuments;
    [RecordType.StudentGroup]: ApiStudentGroup;
    [RecordType.AllowedAction]: AllowedAction;
    [RecordType.CmsSettings]: CmsSettings;
};

export interface NewRecord<T extends RecordType> {
    type: T;
    record: TypeRecordMap[T];
}

export interface ChangedRecord<T extends RecordType> {
    type: T;
    record: TypeRecordMap[T];
}

export interface ChangedDocument {
    id: string;
    data: Prisma.JsonValue;
    updatedAt: Date;
}

export interface ConnectedClients {
    rooms: [string, number][];
    type: 'full' | 'update';
}

export interface DeletedRecord {
    type: RecordType;
    id: string;
}

interface NotificationBase {
    to: string | string[];
    toSelf?: true | boolean;
}

interface NotificationNewRecord extends NotificationBase {
    event: IoEvent.NEW_RECORD;
    message: NewRecord<RecordType>;
}

interface NotificationChangedRecord extends NotificationBase {
    event: IoEvent.CHANGED_RECORD;
    message: ChangedRecord<RecordType>;
}

interface NotificationDeletedRecord extends NotificationBase {
    event: IoEvent.DELETED_RECORD;
    message: DeletedRecord;
}
interface NotificationChangedDocument extends NotificationBase {
    event: IoEvent.CHANGED_DOCUMENT;
    message: ChangedDocument;
}

export type Notification =
    | NotificationNewRecord
    | NotificationChangedRecord
    | NotificationDeletedRecord
    | NotificationChangedDocument;

/**
 * client side initiated events
 */
export enum IoClientEvent {
    JOIN_ROOM = 'JOIN_ROOM',
    LEAVE_ROOM = 'LEAVE_ROOM',
    ACTION = 'ACTION'
}

export type ServerToClientEvents = {
    [IoEvent.NEW_RECORD]: (message: NewRecord<RecordType>) => void;
    [IoEvent.CHANGED_RECORD]: (message: ChangedRecord<RecordType>) => void;
    [IoEvent.DELETED_RECORD]: (message: DeletedRecord) => void;
    [IoEvent.CHANGED_DOCUMENT]: (message: ChangedDocument) => void;
    [IoEvent.CONNECTED_CLIENTS]: (message: ConnectedClients) => void;
    [IoEvent.ACTION]: (message: Action['action']) => void;
};

interface ActionNavigationReload {
    type: 'nav-reload';
}
interface ActionNavigationTarget {
    type: 'nav-target';
    target: string;
}

export type ActionNavigation = ActionNavigationReload | ActionNavigationTarget;

export interface Action {
    action: ActionNavigation;
    roomIds: string[];
    userIds: string[];
}

export interface ClientToServerEvents {
    [IoClientEvent.JOIN_ROOM]: (roomId: string, callback: (joined: boolean) => void) => void;
    [IoClientEvent.LEAVE_ROOM]: (roomId: string, callback: (left: boolean) => void) => void;
    [IoClientEvent.ACTION]: (action: Action, callback: (ok: boolean) => void) => void;
}
