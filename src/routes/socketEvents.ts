/* istanbul ignore file */

import { Role, type User } from '@prisma/client';
import { Server } from 'socket.io';
import Logger from '../utils/logger';
import {
    ClientToServerEvents,
    IoEvent,
    IoClientEvent,
    ServerToClientEvents,
    NavigationRequest
} from './socketEventTypes';
import StudentGroup from '../models/StudentGroup';
import prisma from '../prisma';
import { hasElevatedAccess } from '../models/User';

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

        if (user.role === Role.ADMIN) {
            socket.join(IoRoom.ADMIN);
            const rooms = [...io.sockets.adapter.rooms.keys()].map(
                (id) => [id, io.sockets.adapter.rooms.get(id)?.size || 0] as [string, number]
            );
            io.to(IoRoom.ADMIN).emit(IoEvent.CONNECTED_CLIENTS, { rooms: rooms, type: 'full' });
        }
        if (hasElevatedAccess(user.role)) {
            socket.on(IoClientEvent.REQUEST_NAVIGATION, (navRequest, onDone) => {
                if (user.role === Role.ADMIN) {
                    socket
                        .to([...navRequest.roomIds, ...navRequest.userIds])
                        .except(socket.id)
                        .emit(IoEvent.REQUEST_NAVIGATION, navRequest.action);
                    onDone(true);
                    return;
                }
                // check access first
                (navRequest.roomIds.length > 0
                    ? prisma.studentGroup
                          .findMany({
                              where: {
                                  id: { in: navRequest.roomIds },
                                  users: {
                                      some: {
                                          userId: user.id,
                                          isAdmin: true
                                      }
                                  }
                              },
                              select: {
                                  id: true
                              }
                          })
                          .then((sg) => {
                              return sg.map((group) => group.id);
                          })
                    : Promise.resolve([])
                ).then((groupIds) => {
                    return (
                        navRequest.userIds.length > 0
                            ? prisma.studentGroup
                                  .findMany({
                                      where: {
                                          AND: [
                                              {
                                                  users: {
                                                      some: {
                                                          userId: { in: navRequest.userIds }
                                                      }
                                                  }
                                              },
                                              {
                                                  users: {
                                                      some: {
                                                          userId: user.id,
                                                          isAdmin: true
                                                      }
                                                  }
                                              }
                                          ]
                                      },
                                      select: {
                                          users: {
                                              select: {
                                                  userId: true
                                              }
                                          }
                                      }
                                  })
                                  .then((studentGroups) => {
                                      return studentGroups
                                          .flatMap((group) => group.users.flatMap((user) => user.userId))
                                          .filter((id) => navRequest.userIds.includes(id));
                                  })
                            : Promise.resolve([])
                    ).then((userIds) => {
                        const audience = [...userIds, ...groupIds];
                        if (audience.length > 0) {
                            socket
                                .to(audience)
                                .except(socket.id)
                                .emit(IoEvent.REQUEST_NAVIGATION, navRequest.action);
                        }
                        onDone(true);
                    });
                });
            });
        }
        socket.join(IoRoom.ALL);
        socket.on(IoClientEvent.JOIN_ROOM, (roomId: string, callback: (joined: boolean) => void) => {
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
        });
        socket.on(IoClientEvent.LEAVE_ROOM, (roomId: string, callback: (left: boolean) => void) => {
            if (hasElevatedAccess(user.role)) {
                socket.leave(roomId);
                return callback(true);
            }
            // students can only leave rooms where they are not part of.
            prisma.userStudentGroup
                .findMany({
                    where: {
                        studentGroupId: roomId
                    },
                    select: {
                        userId: true
                    },
                    distinct: ['userId']
                })
                .then((roomMembers) => {
                    // leave the room if:
                    // - the roomId is associated to a room, when it has at least one member
                    // - the user is not part of the room
                    if (
                        roomMembers.length > 0 &&
                        !roomMembers.map((member) => member.userId).includes(user.id)
                    ) {
                        socket.leave(roomId);
                        callback(true);
                    } else {
                        callback(false);
                    }
                });
        });
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
