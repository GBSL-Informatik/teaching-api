import type { User as pUser } from '@prisma/client';
import type { ClientToServerEvents, Notification, ServerToClientEvents } from '../../routes/socketEventTypes';
import { Server } from 'socket.io';

// to make the file a module and avoid a TypeScript error
export {};

declare global {
    namespace Express {
        export interface Request {
            user: pUser;
            io?: Server<ClientToServerEvents, ServerToClientEvents>;
        }

        export interface Response {
            notifications?: Notification[];
        }
    }
}
