import { Role } from '../models/User';

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
    loggingLevel: 'info' | 'warn' | 'error';
}
export interface AccessMatrix {
    [key: string]: {
        path: string;
        access: { methods: ('GET' | 'POST' | 'PUT' | 'DELETE')[]; minRole: Role }[];
    };
}

interface Config {
    credentials: Credentials;
    metadata: Metadata;
    settings: Settings;
    accessMatrix: AccessMatrix;
}

const authConfig: Config = {
    credentials: { tenantID: process.env.MSAL_TENANT_ID || '', clientID: process.env.MSAL_CLIENT_ID || '' },
    metadata: {
        authority: 'login.microsoftonline.com',
        discovery: '.well-known/openid-configuration',
        version: 'v2.0'
    },
    settings: { validateIssuer: true, passReqToCallback: false, loggingLevel: 'warn' },
    accessMatrix: {
        checklogin: { path: '/checklogin', access: [{ methods: ['GET'], minRole: Role.STUDENT }] },
        user: { path: '/user', access: [{ methods: ['GET', 'POST'], minRole: Role.STUDENT }] },
        admin: {
            path: '/admin',
            access: [{ methods: ['DELETE', 'GET', 'POST', 'PUT'], minRole: Role.TEACHER }]
        },
        users: { path: '/users', access: [{ methods: ['GET'], minRole: Role.STUDENT }] },
        userFind: { path: '/users/:id', access: [{ methods: ['GET', 'PUT'], minRole: Role.STUDENT }] },
        usersDocumentRoots: {
            path: '/users/:id/documentRoots',
            access: [{ methods: ['GET'], minRole: Role.STUDENT }]
        },
        studentGroups: {
            path: '/studentGroups',
            access: [
                { methods: ['GET'], minRole: Role.STUDENT },
                { methods: ['GET', 'PUT', 'POST', 'DELETE'], minRole: Role.TEACHER }
            ]
        },
        permissions: {
            path: '/permissions',
            access: [{ methods: ['POST', 'PUT', 'DELETE'], minRole: Role.TEACHER }]
        },
        documents: {
            path: '/documents',
            access: [{ methods: ['GET', 'PUT', 'POST', 'DELETE'], minRole: Role.STUDENT }]
        },
        documentRoots: {
            path: '/documentRoots',
            access: [
                { methods: ['GET', 'POST'], minRole: Role.STUDENT },
                { methods: ['PUT', 'DELETE'], minRole: Role.TEACHER }
            ]
        },
        documentRootPermissions: {
            path: '/documentRoots/:id/permissions',
            access: [{ methods: ['GET'], minRole: Role.TEACHER }]
        },
        githubToken: { path: '/cms', access: [{ methods: ['GET', 'PUT'], minRole: Role.STUDENT }] },
        githubLogout: { path: '/cms/logout', access: [{ methods: ['POST'], minRole: Role.STUDENT }] }
    }
};

export default authConfig;
