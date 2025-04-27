import { Role, User } from '@prisma/client';
import { ClientToServerEvents, IoClientEvent, ServerToClientEvents } from '../socketEventTypes';
import type { DefaultEventsMap, Socket } from 'socket.io';
import prisma from '../../prisma';
import StudentGroup from '../../models/StudentGroup';

const onJoinRoom: (
    user: User,
    socket: Socket<ClientToServerEvents, ServerToClientEvents, DefaultEventsMap, any>
) => ClientToServerEvents[IoClientEvent.JOIN_ROOM] =
    (user, socket) => (roomId: string, callback: (joined: boolean) => void) => {
        if (user.role === Role.ADMIN) {
            socket.join(roomId);
            return callback(true);
        }
        StudentGroup.findModel(user, roomId).then((group) => {
            if (group) {
                socket.join(roomId);
                callback(true);
            } else {
                if (user.role === Role.TEACHER) {
                    prisma.studentGroup
                        .findFirst({
                            where: {
                                users: {
                                    some: {
                                        AND: [
                                            {
                                                userId: user.id,
                                                isAdmin: true
                                            },
                                            {
                                                userId: roomId
                                            }
                                        ]
                                    }
                                }
                            }
                        })
                        .then((userRoom) => {
                            if (userRoom) {
                                socket.join(roomId);
                                callback(true);
                            } else {
                                callback(false);
                            }
                        });
                }
            }
        });
    };

export default onJoinRoom;
