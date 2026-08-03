import {
    ChangedDocument,
    ClientToServerEvents,
    IoClientEvent,
    IoEvent,
    ServerToClientEvents
} from '../socketEventTypes.js';
import { User } from '../../../prisma/generated/client.js';
import type { DefaultEventsMap, Socket } from 'socket.io';
import { StreamableGroupUserCacheStore } from '../../models/StudentGroup.js';

const onStreamUpdate: (
    user: User,
    socket: Socket<ClientToServerEvents, ServerToClientEvents, DefaultEventsMap, any>
) => ClientToServerEvents[IoClientEvent.STREAM_UPDATE] = (user, socket) => (payload) => {
    if (!StreamableGroupUserCacheStore.get(payload.roomId)?.has(user.id)) {
        return;
    }
    const pkg: ChangedDocument = {
        data: payload.data,
        id: payload.id,
        updatedAt: new Date()
    };
    if (payload.meta) {
        pkg.meta = payload.meta;
    }

    socket.to(payload.roomId).except(socket.id).emit(IoEvent.CHANGED_DOCUMENT, pkg);
};

export const onStreamDynamicRoomUpdate: (
    roomId: string,
    socket: Socket<ClientToServerEvents, ServerToClientEvents, DefaultEventsMap, any>
) => ClientToServerEvents[IoClientEvent.STREAM_UPDATE] = (roomId, socket) => (payload) => {
    if (roomId !== payload.roomId) {
        return;
    }
    const pkg: ChangedDocument = {
        data: payload.data,
        id: payload.id,
        updatedAt: new Date()
    };
    if (payload.meta) {
        pkg.meta = payload.meta;
    }

    socket.to(payload.roomId).except(socket.id).emit(IoEvent.CHANGED_DOCUMENT, pkg);
};

export default onStreamUpdate;
