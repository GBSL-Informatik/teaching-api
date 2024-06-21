import { Role } from '@prisma/client';

interface Credentials {
    tenantID: string;
    clientID: string;
}
interface Metadata {
    authority: string;
    discovery: string;
    version: string;
}
interface Settings {
    validateIssuer: boolean;
    passReqToCallback: boolean;
    loggingLevel: string;
}
export interface AccessMatrix {
    [key: string]: {
        path: string;
        access: {
            methods: ('GET' | 'POST' | 'PUT' | 'DELETE')[];
            roles: Role[];
        }[];
    };
}

interface Config {
    credentials: Credentials;
    metadata: Metadata;
    settings: Settings;
    accessMatrix: AccessMatrix;
}

/**
 * Routes that are accessible without authentication
 * only for GET requests, e.g. ['/public']
 */
export const PUBLIC_ROUTES: string[] = ['/logout'];

const authConfig: Config = {
    credentials: {
        tenantID: process.env.MSAL_TENANT_ID || '',
        clientID: process.env.MSAL_CLIENT_ID || ''
    },
    metadata: {
        authority: 'login.microsoftonline.com',
        discovery: '.well-known/openid-configuration',
        version: 'v2.0'
    },
    settings: {
        validateIssuer: true,
        passReqToCallback: false,
        loggingLevel: 'warn'
    },
    accessMatrix: {
        checklogin: {
            path: '/checklogin',
            access: [
                {
                    methods: ['GET'],
                    roles: [Role.ADMIN, Role.TEACHER, Role.STUDENT]
                }
            ]
        },
        user: {
            path: '/user',
            access: [
                {
                    methods: ['GET', 'POST'],
                    roles: [Role.ADMIN, Role.TEACHER, Role.STUDENT]
                }
            ]
        },
        users: {
            path: '/users',
            access: [
                {
                    methods: ['GET'],
                    roles: [Role.ADMIN, Role.TEACHER, Role.STUDENT]
                }
            ]
        },
        userFind: {
            path: '/users/:id',
            access: [
                {
                    methods: ['GET', 'PUT'],
                    roles: [Role.ADMIN, Role.TEACHER, Role.STUDENT]
                }
            ]
        },
        groups: {
            path: '/groups',
            access: [
                {
                    methods: ['GET', 'PUT', 'POST', 'DELETE'],
                    roles: [Role.ADMIN, Role.TEACHER, Role.STUDENT]
                }
            ]
        }
    }
};

export default authConfig;
