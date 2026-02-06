import { Role } from '../models/User.js';

export interface AccessMatrix {
    [key: string]: {
        path: string;
        access: { methods: ('GET' | 'POST' | 'PUT' | 'DELETE')[]; minRole: Role }[];
    };
}

interface Config {
    accessMatrix: AccessMatrix;
}

const authConfig: Config = {
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
            access: [{ methods: ['GET', 'POST'], minRole: Role.STUDENT }]
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
        documentsMultiple: {
            path: '/documents/multiple',
            access: [{ methods: ['POST'], minRole: Role.TEACHER }]
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
