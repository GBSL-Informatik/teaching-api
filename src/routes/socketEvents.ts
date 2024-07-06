/* istanbul ignore file */

import type { User } from '@prisma/client';
import { Server } from 'socket.io';
import Logger from '../utils/logger';
import { ClientToServerEvents, IoEvents, ServerToClientEvents } from './socketEventTypes';

export enum IoRoom {
    ADMIN = 'admin',
    ALL = 'all'
}

const EventRouter = (io: Server<ClientToServerEvents, ServerToClientEvents>) => {
    io.on('connection', (socket) => {
        const user = (socket.request as { user?: User }).user;
        if (!user) {
            return socket.disconnect();
        }
        const sid = (socket.request as { sessionID?: string }).sessionID;
        if (sid) {
            socket.join(sid);
        }
        if (user.isAdmin) {
            socket.join(IoRoom.ADMIN);
        }
        socket.join(IoRoom.ALL);
        /**
         * TODO: Join the user's studentGroups?
         */

    });

    io.on('disconnect', (socket) => {
        const { user } = socket.request as { user?: User };
        Logger.info(`Socket.io disconnect ${user?.email}`);
    });

    io.on('error', (socket) => {
        Logger.error(`Socket.io error`);
    });

    io.on('reconnect', (socket) => {
        const { user } = socket.request as { user?: User };
        Logger.info(`Socket.io reconnect ${user?.email}`);
    });
};

export default EventRouter;
