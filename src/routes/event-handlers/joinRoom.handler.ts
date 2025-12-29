import { User } from '../../../prisma/generated/client';
import { ClientToServerEvents, IoClientEvent, ServerToClientEvents } from '../socketEventTypes';
import type { DefaultEventsMap, Socket } from 'socket.io';
import prisma from '../../prisma';
import StudentGroup from '../../models/StudentGroup';
import onStreamUpdate from './streamUpdate.handler';
import DocumentRoot from '../../models/DocumentRoot';
import { highestAccess, RWAccess } from '../../helpers/accessPolicy';
import { Role } from '../../models/User';
type SocketType = Socket<ClientToServerEvents, ServerToClientEvents, DefaultEventsMap, any>;

const isDocumentRoot = (roomId: string) => {
    return prisma.documentRoot.findFirst({ where: { id: roomId } });
};

const findDocumentRoot = (user: User, roomId: string) => {
    return DocumentRoot.getPermissions(user, roomId).then((res) => {
        if (!res) {
            return false;
        } else {
            const access = new Set([
                ...res.groupPermissions.map((p) => p.access),
                ...res.userPermissions.map((p) => p.access)
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
        socket.on(IoClientEvent.STREAM_UPDATE, onStreamUpdate(roomId, socket));
    }
};

const onJoinRoom: (user: User, socket: SocketType) => ClientToServerEvents[IoClientEvent.JOIN_ROOM] =
    (user, socket) => (roomId: string, callback: (joined: boolean) => void) => {
        if (user.role === Role.ADMIN) {
            return isDocumentRoot(roomId)
                .then((docRoot) => {
                    joinRoom(socket, roomId, !!docRoot);
                    callback(true);
                })
                .catch(() => {
                    callback(false);
                });
        }
        StudentGroup.findModel(user, roomId).then((group) => {
            if (group) {
                socket.join(roomId);
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
