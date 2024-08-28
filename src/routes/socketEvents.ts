/* istanbul ignore file */

import type { User } from '@prisma/client';
import { Server } from 'socket.io';
import Logger from '../utils/logger';
import { ClientToServerEvents, IoEvent, IoClientEvent, ServerToClientEvents } from './socketEventTypes';
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
            socket.on(IoClientEvent.JOIN_ROOM, (roomId: string, callback: () => void) => {
                socket.join(roomId);
                callback();
            });
            socket.on(IoClientEvent.LEAVE_ROOM, (roomId: string, callback: () => void) => {
                socket.leave(roomId);
                callback();
            });
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

    io.of('/').adapter.on('join-room', (room, id) => {
        const size = io.sockets.adapter.rooms.get(room)?.size || 0;
        io.to(room).emit(IoEvent.CONNECTED_CLIENTS, { room, count: size });
    });
    io.of('/').adapter.on('leave-room', (room, id) => {
        const size = io.sockets.adapter.rooms.get(room)?.size || 0;
        io.to(room).except(id).emit(IoEvent.CONNECTED_CLIENTS, { room, count: size });
    });
};

export default EventRouter;
