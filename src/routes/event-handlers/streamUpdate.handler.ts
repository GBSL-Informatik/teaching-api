import { ClientToServerEvents, IoClientEvent, IoEvent, ServerToClientEvents } from '../socketEventTypes.js';
import type { DefaultEventsMap, Socket } from 'socket.io';

const onStreamUpdate: (
    roomId: string,
    socket: Socket<ClientToServerEvents, ServerToClientEvents, DefaultEventsMap, any>
) => ClientToServerEvents[IoClientEvent.STREAM_UPDATE] = (roomId, socket) => (payload) => {
    if (roomId !== payload.roomId) {
        return;
    }
    socket.to(payload.roomId).emit(IoEvent.CHANGED_DOCUMENT, {
        data: payload.data,
        id: payload.id,
        updatedAt: payload.updatedAt
    });
};

export default onStreamUpdate;
