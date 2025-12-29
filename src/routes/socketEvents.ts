/* istanbul ignore file */

import { type User } from '../../prisma/generated/client.js';
import { Server } from 'socket.io';
import Logger from '../utils/logger.js';
import { ClientToServerEvents, IoEvent, IoClientEvent, ServerToClientEvents } from './socketEventTypes.js';
import StudentGroup from '../models/StudentGroup.js';
import { hasElevatedAccess, Role } from '../models/User.js';
import onAction from './event-handlers/action.handler.js';
import onJoinRoom from './event-handlers/joinRoom.handler.js';
import onLeaveRoom from './event-handlers/leaveRoom.handler.js';
import { auth } from '../auth.js';

export enum IoRoom {
    ADMIN = 'admin',
    ALL = 'all'
}

const EventRouter = (io: Server<ClientToServerEvents, ServerToClientEvents>) => {
    io.on('connection', async (socket) => {
        const token = socket.handshake.auth.token;

        const session = await auth.api.verifyOneTimeToken({ body: { token } }).catch(() => null);

        if (!session?.user) {
            return socket.disconnect();
        }
        const user = session.user as User;
        socket.join(user.id);
        if (!user) {
            return socket.disconnect();
        }
        socket.join(user.id);
        if (user.role === Role.ADMIN) {
            socket.join(IoRoom.ADMIN);
            const rooms = [...io.sockets.adapter.rooms.keys()].map(
                (id) => [id, io.sockets.adapter.rooms.get(id)?.size || 0] as [string, number]
            );
            io.to(IoRoom.ADMIN).emit(IoEvent.CONNECTED_CLIENTS, { rooms: rooms, type: 'full' });
        }
        if (hasElevatedAccess(user.role)) {
            socket.on(IoClientEvent.ACTION, onAction(user, socket));
        }
        socket.join(IoRoom.ALL);
        socket.on(IoClientEvent.JOIN_ROOM, onJoinRoom(user, socket));
        socket.on(IoClientEvent.LEAVE_ROOM, onLeaveRoom(user, socket));
        const groups = await StudentGroup.all(user);
        const groupIds = groups.map((group) => group.id);
        if (groupIds.length > 0) {
            socket.join(groupIds);
        }
    });

    io.on('disconnect', (socket) => {
        Logger.info(`Socket.io disconnect ${socket.id}`);
    });

    io.on('error', (socket) => {
        Logger.error(`Socket.io error ${socket.id}`);
    });

    io.on('reconnect', (socket) => {
        Logger.info(`Socket.io reconnect ${socket.id}`);
    });

    io.of('/').adapter.on('join-room', (room, id) => {
        const size = io.sockets.adapter.rooms.get(room)?.size || 0;
        io.to([room, IoRoom.ADMIN]).emit(IoEvent.CONNECTED_CLIENTS, {
            rooms: [[room, size]],
            type: 'update'
        });
    });
    io.of('/').adapter.on('leave-room', (room, id) => {
        const size = io.sockets.adapter.rooms.get(room)?.size || 0;
        io.to([room, IoRoom.ADMIN]).emit(IoEvent.CONNECTED_CLIENTS, {
            rooms: [[room, size]],
            type: 'update'
        });
    });
};

export default EventRouter;
