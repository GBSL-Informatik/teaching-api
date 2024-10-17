/* istanbul ignore file */

import type { User } from '@prisma/client';
import { Server } from 'socket.io';
import Logger from '../utils/logger';
import {
    ClientToServerEvents,
    IoEvent,
    IoClientEvent,
    ServerToClientEvents,
    iMessage
} from './socketEventTypes';
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
            const rooms = [...io.sockets.adapter.rooms.keys()].map(
                (id) => [id, io.sockets.adapter.rooms.get(id)?.size || 0] as [string, number]
            );
            io.to(IoRoom.ADMIN).emit(IoEvent.CONNECTED_CLIENTS, { rooms: rooms, type: 'full' });
        }
        socket.join(IoRoom.ALL);
        const groups = await StudentGroup.all(user);
        const groupIds = groups.map((group) => group.id);
        if (groupIds.length > 0) {
            socket.join(groupIds);
        }
        socket.on(IoClientEvent.USER_JOIN_ROOM, (roomName: string, callback: (roomId: string) => void) => {
            if (roomName) {
                const roomId = roomName.startsWith('user:') ? roomName : `user:${roomName}`;
                const room = roomId.replace('user:', '');
                io.sockets.in(user.id).socketsJoin(roomId);
                callback(room);
            }
        });
        socket.on(IoClientEvent.USER_LEAVE_ROOM, (roomName: string, callback: () => void) => {
            if (roomName) {
                const roomId = roomName.startsWith('user:') ? roomName : `user:${roomName}`;
                io.sockets.in(user.id).socketsLeave(roomId);
                callback();
            }
        });
        socket.on(
            IoClientEvent.USER_MESSAGE,
            async (to: string, message: iMessage, callback: (serverSentAt: Date | null) => void) => {
                if (to && message) {
                    const roomId = to.startsWith('user:') ? to : `user:${to}`;
                    const roomName = roomId.replace('user:', '');
                    const room = io.sockets.adapter.rooms.get(roomId);
                    const isJoined = room?.has(socket.id);
                    if (isJoined) {
                        const serverSentAt = new Date();
                        io.to(roomId).emit(IoEvent.USER_MESSAGE, roomName, {
                            ...message,
                            serverSentAt: serverSentAt,
                            senderId: user.id
                        });
                        return callback(serverSentAt);
                    }
                    callback(null);
                }
            }
        );
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
        io.to([room, IoRoom.ADMIN]).emit(IoEvent.CONNECTED_CLIENTS, {
            rooms: [[room, size]],
            type: 'update'
        });
    });
    io.of('/').adapter.on('leave-room', (room, id) => {
        const size = io.sockets.adapter.rooms.get(room)?.size || 0;
        if (size === 0) {
            io.sockets.adapter.rooms.delete(room);
        }
        io.to([room, IoRoom.ADMIN]).emit(IoEvent.CONNECTED_CLIENTS, {
            rooms: [[room, size]],
            type: 'update'
        });
    });
};

export default EventRouter;
