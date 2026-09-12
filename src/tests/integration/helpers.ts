import request from 'supertest';
import { randomUUID } from 'crypto';
import app from '../../app.js';
import prisma from '../../prisma.js';
import { Role } from '../../models/User.js';

export const API_URL = '/api/v1';

/**
 * Builds a supertest agent that authenticates as the given user by setting the
 * `x-test-user-id` header, which is picked up by the mocked auth session in ./setup.ts.
 */
export const agentAs = (userId: string) => {
    const withHeader = (req: request.Test) => req.set('x-test-user-id', userId);
    return {
        get: (url: string) => withHeader(request(app).get(url)),
        post: (url: string) => withHeader(request(app).post(url)),
        put: (url: string) => withHeader(request(app).put(url)),
        delete: (url: string) => withHeader(request(app).delete(url))
    };
};

export const createTestUser = async (role: Role = Role.STUDENT) => {
    const id = randomUUID();
    return prisma.user.create({
        data: {
            id,
            email: `${id}@test.gbsl.ch`,
            firstName: 'Test',
            lastName: 'User',
            name: 'Test User',
            role
        }
    });
};

export const deleteTestUsers = async (...ids: string[]) => {
    if (ids.length === 0) {
        return;
    }
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
};

export const deleteTestDocumentRoots = async (...ids: string[]) => {
    if (ids.length === 0) {
        return;
    }
    await prisma.documentRoot.deleteMany({ where: { id: { in: ids } } });
};
