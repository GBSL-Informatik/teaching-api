import type { User as pUser } from '@prisma/client';
import { Notification } from '../../routes/socketEventTypes';

// to make the file a module and avoid a TypeScript error
export {};

declare global {
    namespace Express {
        export interface User extends pUser {}
        export interface Request {
            io?: Server<ClientToServerEvents, ServerToClientEvents>;
        }

        export interface Response {
            notifications?: Notification[];
        }
    }
}
