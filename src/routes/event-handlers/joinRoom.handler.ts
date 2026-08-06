import { User } from '../../../prisma/generated/client.js';
import { ClientToServerEvents, IoClientEvent, ServerToClientEvents } from '../socketEventTypes.js';
import type { DefaultEventsMap, Socket } from 'socket.io';
import prisma from '../../prisma.js';
import StudentGroup from '../../models/StudentGroup.js';
import onStreamUpdate, { onStreamDynamicRoomUpdate } from './streamUpdate.handler.js';
import DocumentRoot from '../../models/DocumentRoot.js';
import { highestAccess, RWAccess } from '../../helpers/accessPolicy.js';
import { Role } from '../../models/User.js';
import Logger from '../../utils/logger.js';
type SocketType = Socket<ClientToServerEvents, ServerToClientEvents, DefaultEventsMap, any>;

const isDocumentRoot = (roomId: string) => {
    return prisma.documentRoot.findFirst({ where: { id: roomId } });
};

const findDocumentRoot = (user: User, roomId: string) => {
    return DocumentRoot.getPermissions(user, [roomId]).then((res) => {
        if (!res || res.length !== 1) {
            return false;
        } else {
            const access = new Set([
                ...res[0].groupPermissions.map((p) => p.access),
                ...res[0].userPermissions.map((p) => p.access)
            ]);
            const current = highestAccess(access);
            return RWAccess.has(current);
        }
    });
};

const findStudentGroup = (userId: string, roomId: string) => {
    return prisma.studentGroup.findFirst({
        where: { users: { some: { AND: [{ userId: userId, isAdmin: true }, { userId: roomId }] } } }
    });
};

const joinRoom = (socket: SocketType, roomId: string, joinStreamGroup: boolean) => {
    socket.join(roomId);
    if (joinStreamGroup) {
        socket.on(IoClientEvent.STREAM_UPDATE, onStreamDynamicRoomUpdate(roomId, socket));
    }
};

const onJoinRoom: (user: User, socket: SocketType) => ClientToServerEvents[IoClientEvent.JOIN_ROOM] =
    (user, socket) => (roomId: string, callback: (joined: boolean) => void) => {
        if (user.role === Role.ADMIN) {
            return Promise.all([isDocumentRoot(roomId), StudentGroup.findModel(user, roomId)])
                .then(([docRoot, group]) => {
                    joinRoom(socket, roomId, !!docRoot || !!(group && group.canPresent));
                    callback(true);
                })
                .catch(() => {
                    callback(false);
                });
        }
        StudentGroup.findModel(user, roomId).then((group) => {
            if (group) {
                joinRoom(socket, roomId, group.canPresent);
                callback(true);
            } else {
                if (user.role === Role.TEACHER) {
                    findStudentGroup(user.id, roomId).then((userRoom) => {
                        if (userRoom) {
                            joinRoom(socket, roomId, false);
                            callback(true);
                        } else {
                            findDocumentRoot(user, roomId)
                                .then((canJoin) => {
                                    joinRoom(socket, roomId, canJoin);
                                    callback(true);
                                })
                                .catch(() => {
                                    callback(false);
                                });
                        }
                    });
                }
            }
        });
    };

export default onJoinRoom;
