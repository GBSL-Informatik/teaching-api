import { User } from '../../../prisma/generated/client.js';
import { ClientToServerEvents, IoClientEvent, IoEvent, ServerToClientEvents } from '../socketEventTypes.js';
import type { DefaultEventsMap, Socket } from 'socket.io';
import prisma from '../../prisma.js';
import { Role } from '../../models/User.js';

const onAction: (
    user: User,
    socket: Socket<ClientToServerEvents, ServerToClientEvents, DefaultEventsMap, any>
) => ClientToServerEvents[IoClientEvent.ACTION] = (user, socket) => (navRequest, onDone) => {
    if (user.role === Role.ADMIN) {
        socket
            .to([...navRequest.roomIds, ...navRequest.userIds])
            .except(socket.id)
            .emit(IoEvent.ACTION, navRequest.action);
        return onDone(true);
    }
    if (navRequest.roomIds.length === 0) {
        // check that only administrated users receive the action
        return prisma.user
            .findMany({
                where: {
                    id: { in: navRequest.userIds },
                    studentGroups: {
                        some: {
                            studentGroup: {
                                users: {
                                    some: {
                                        userId: user.id,
                                        isAdmin: true
                                    }
                                }
                            }
                        }
                    }
                },
                distinct: ['id'],
                select: { id: true }
            })
            .then((users) => {
                if (users.length > 0) {
                    socket
                        .to(users.map((u) => u.id))
                        .except(socket.id)
                        .emit(IoEvent.ACTION, navRequest.action);
                }
                onDone(true);
            })
            .catch((err) => {
                console.error('Error checking user access for action', err);
                onDone(false);
            });
    }
    // check access first
    (navRequest.roomIds.length > 0
        ? prisma.studentGroup
              .findMany({
                  where: {
                      id: { in: navRequest.roomIds },
                      users: { some: { userId: user.id, isAdmin: true } }
                  },
                  select: { id: true }
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
                                  { users: { some: { userId: { in: navRequest.userIds } } } },
                                  { users: { some: { userId: user.id, isAdmin: true } } }
                              ]
                          },
                          select: { users: { select: { userId: true } } }
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
                socket.to(audience).except(socket.id).emit(IoEvent.ACTION, navRequest.action);
            }
            onDone(true);
        });
    });
};

export default onAction;
