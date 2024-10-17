import { Prisma, User } from '@prisma/client';
import { ApiDocument } from '../models/Document';
import { ApiUserPermission } from '../models/RootUserPermission';
import { ApiGroupPermission } from '../models/RootGroupPermission';
import { ApiDocumentRootUpdate } from '../models/DocumentRoot';

export enum IoEvent {
    NEW_RECORD = 'NEW_RECORD',
    CHANGED_RECORD = 'CHANGED_RECORD',
    CHANGED_DOCUMENT = 'CHANGED_DOCUMENT',
    DELETED_RECORD = 'DELETED_RECORD',
    CONNECTED_CLIENTS = 'CONNECTED_CLIENTS',
    USER_MESSAGE = 'USER_MESSAGE'
}

export enum RecordType {
    Document = 'Document',
    User = 'User',
    UserPermission = 'UserPermission',
    GroupPermission = 'GroupPermission',
    DocumentRoot = 'DocumentRoot'
}

type TypeRecordMap = {
    [RecordType.Document]: ApiDocument;
    [RecordType.User]: User;
    [RecordType.UserPermission]: ApiUserPermission;
    [RecordType.GroupPermission]: ApiGroupPermission;
    [RecordType.DocumentRoot]: ApiDocumentRootUpdate;
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
    USER_JOIN_ROOM = 'USER_JOIN_ROOM',
    USER_LEAVE_ROOM = 'USER_LEAVE_ROOM',
    USER_MESSAGE = 'USER_MESSAGE'
}

export interface iMessage<T = any> {
    type: string;
    data: T;
}

export interface iDeliveredMessage<T = any> extends iMessage<T> {
    senderId: string;
    serverSentAt: Date;
}

export type ServerToClientEvents = {
    [IoEvent.NEW_RECORD]: (message: NewRecord<RecordType>) => void;
    [IoEvent.CHANGED_RECORD]: (message: ChangedRecord<RecordType>) => void;
    [IoEvent.DELETED_RECORD]: (message: DeletedRecord) => void;
    [IoEvent.CHANGED_DOCUMENT]: (message: ChangedDocument) => void;
    [IoEvent.CONNECTED_CLIENTS]: (message: ConnectedClients) => void;
    [IoEvent.USER_MESSAGE]: (roomName: string, message: iDeliveredMessage) => void;
};

export interface ClientToServerEvents {
    [IoClientEvent.JOIN_ROOM]: (roomId: string, callback: () => void) => void;
    [IoClientEvent.LEAVE_ROOM]: (roomId: string, callback: () => void) => void;
    [IoClientEvent.USER_JOIN_ROOM]: (roomName: string, callback: (roomName: string) => void) => void;
    [IoClientEvent.USER_LEAVE_ROOM]: (roomName: string, callback: () => void) => void;
    [IoClientEvent.USER_MESSAGE]: (
        to: string,
        message: iMessage,
        callback: (serverSentAt: Date | null) => void
    ) => void;
}
