import { User } from '../../../prisma/generated/client.js';
import { ClientToServerEvents, IoClientEvent, ServerToClientEvents } from '../socketEventTypes.js';
import type { DefaultEventsMap, Socket } from 'socket.io';
import prisma from '../../prisma.js';
import { hasElevatedAccess } from '../../models/User.js';

const onLeaveRoom: (
    user: User,
    socket: Socket<ClientToServerEvents, ServerToClientEvents, DefaultEventsMap, any>
) => ClientToServerEvents[IoClientEvent.JOIN_ROOM] =
    (user, socket) => (roomId: string, callback: (left: boolean) => void) => {
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
                if (roomMembers.length > 0 && !roomMembers.map((member) => member.userId).includes(user.id)) {
                    socket.leave(roomId);
                    callback(true);
                } else {
                    callback(false);
                }
            });
    };

export default onLeaveRoom;
