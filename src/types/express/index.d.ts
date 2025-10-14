import type { User as pUser } from '@prisma/client';
import type { Notification } from '../../routes/socketEventTypes';

// to make the file a module and avoid a TypeScript error
export {};

declare global {
    namespace Express {
        export interface Request {
            user: pUser;
        }

        export interface Response {
            notifications?: Notification[];
        }
    }
}
