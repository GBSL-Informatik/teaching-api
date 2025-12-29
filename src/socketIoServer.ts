import { Server } from 'socket.io';
import type http from 'http';
import type { ClientToServerEvents, ServerToClientEvents, Notification } from './routes/socketEventTypes.js';
import { CORS_ORIGIN } from './utils/originConfig.js';
import EventRouter from './routes/socketEvents.js';

let _io: Server<ClientToServerEvents, ServerToClientEvents>;

export const initialize = (server: http.Server) => {
    if (_io) {
        return _io;
    }
    _io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
        cors: { origin: CORS_ORIGIN, credentials: true, methods: ['GET', 'POST', 'PUT', 'DELETE'] },
        pingInterval: 15_000,
        pingTimeout: 20_000,
        transports: ['websocket', 'webtransport' /* , 'polling' */]
    });
    EventRouter(_io);
    return _io;
};

export const getIo = () => {
    if (!_io) {
        throw new Error('Socket.io not initialized');
    }
    return _io;
};

export const notify = (notification: Notification, sid?: string) => {
    const io = getIo();
    const except: string[] = [];
    /** ignore this socket */
    if (!notification.toSelf && sid) {
        except.push(sid);
    }
    io.except(except)
        .to(notification.to)
        .emit(notification.event, notification.message as any);
};
