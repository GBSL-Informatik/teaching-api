import { User } from '../../../prisma/generated/client';
import { ClientToServerEvents, IoClientEvent, IoEvent, ServerToClientEvents } from '../socketEventTypes';
import type { DefaultEventsMap, Socket } from 'socket.io';
import prisma from '../../prisma';
import { Role } from '../../models/User';

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
