import {
    ChangedDocument,
    ClientToServerEvents,
    IoClientEvent,
    IoEvent,
    ServerToClientEvents
} from '../socketEventTypes.js';
import type { DefaultEventsMap, Socket } from 'socket.io';

const onStreamUpdate: (
    roomId: string,
    socket: Socket<ClientToServerEvents, ServerToClientEvents, DefaultEventsMap, any>
) => ClientToServerEvents[IoClientEvent.STREAM_UPDATE] = (roomId, socket) => (payload) => {
    if (roomId !== payload.roomId) {
        return;
    }
    const pkg: ChangedDocument = {
        data: payload.data,
        id: payload.id,
        updatedAt: payload.updatedAt
    };
    if (payload.meta) {
        pkg.meta = payload.meta;
    }

    socket.to(payload.roomId).emit(IoEvent.CHANGED_DOCUMENT, pkg);
};

export default onStreamUpdate;
