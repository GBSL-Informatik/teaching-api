/* istanbul ignore file */

import type { User } from '@prisma/client';
import { Server } from 'socket.io';
import Logger from '../utils/logger';
import { ClientToServerEvents, ServerToClientEvents } from './socketEventTypes';
import StudentGroup from '../models/StudentGroup';

export enum IoRoom {
    ADMIN = 'admin',
    ALL = 'all'
}

const EventRouter = (io: Server<ClientToServerEvents, ServerToClientEvents>) => {
    io.on('connection', async (socket) => {
        const user = (socket.request as { user?: User }).user;
        if (!user) {
            return socket.disconnect();
        }
        socket.join(user.id);
        if (user.isAdmin) {
            socket.join(IoRoom.ADMIN);
        }
        socket.join(IoRoom.ALL);
        const groups = await StudentGroup.all(user);
        const groupIds = groups.map((group) => group.id);
        if (groupIds.length > 0) {
            socket.join(groupIds);
        }
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
