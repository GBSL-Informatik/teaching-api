import type { User as pUser } from '@prisma/client';

// to make the file a module and avoid a TypeScript error
export {};

declare global {
    namespace Express {
        export interface User extends pUser {}
    }
}
