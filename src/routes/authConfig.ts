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
        access: {
            methods: ('GET' | 'POST' | 'PUT' | 'DELETE')[];
            adminOnly: boolean;
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
                    adminOnly: false
                }
            ]
        },
        user: {
            path: '/user',
            access: [
                {
                    methods: ['GET', 'POST'],
                    adminOnly: false
                }
            ]
        },
        users: {
            path: '/users',
            access: [
                {
                    methods: ['GET'],
                    adminOnly: false
                }
            ]
        },
        userFind: {
            path: '/users/:id',
            access: [
                {
                    methods: ['GET', 'PUT'],
                    adminOnly: false
                }
            ]
        },
        usersDocumentRoots: {
            path: '/users/:id/documentRoots',
            access: [
                {
                    methods: ['GET'],
                    adminOnly: false
                }
            ]
        },
        studentGroups: {
            path: '/studentGroups',
            access: [
                {
                    methods: ['GET'],
                    adminOnly: false
                },
                {
                    methods: ['PUT', 'POST', 'DELETE'],
                    adminOnly: true
                }
            ]
        },
        permissions: {
            path: '/permissions',
            access: [
                {
                    methods: ['POST', 'PUT', 'DELETE'],
                    adminOnly: true
                }
            ]
        },
        documents: {
            path: '/documents',
            access: [
                {
                    methods: ['GET', 'PUT', 'POST', 'DELETE'],
                    adminOnly: false
                }
            ]
        },
        documentRoots: {
            path: '/documentRoots',
            access: [
                {
                    methods: ['GET', 'POST'],
                    adminOnly: false
                },
                {
                    methods: ['PUT'],
                    adminOnly: true
                }
            ]
        },
        documentRootPermissions: {
            path: '/documentRoots/:id/permissions',
            access: [
                {
                    methods: ['GET'],
                    adminOnly: true
                }
            ]
        }
    }
};

export default authConfig;
