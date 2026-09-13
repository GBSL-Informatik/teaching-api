import { randomUUID } from 'crypto';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { Access } from '../../../prisma/generated/enums.js';
import app from '../../app.js';
import { Role } from '../../models/User.js';
import { API_URL, agentAs, createTestUser } from './helpers.js';

describe('DocumentRoots (integration)', () => {
    it('lets a student create and fetch a document root', async () => {
        const user = await createTestUser(Role.STUDENT);
        const agent = agentAs(user.id);

        const documentRootId = randomUUID();

        const createRes = await agent
            .post(`${API_URL}/documentRoots/${documentRootId}`)
            .send({ access: Access.RW_DocumentRoot });

        expect(createRes.status).toBe(200);
        expect(createRes.body.id).toBe(documentRootId);
        expect(createRes.body.access).toBe(Access.RW_DocumentRoot);

        const getRes = await agent.post(`${API_URL}/users/${user.id}/documentRoots`).send({
            documentRootIds: [documentRootId]
        });
        expect(getRes.status).toBe(200);
        expect(getRes.body.length).toBe(1);
        expect(getRes.body[0].id).toBe(documentRootId);
        expect(getRes.body[0].documents).toEqual([]);
    });

    it('rejects unauthenticated requests', async () => {
        const user = await createTestUser(Role.STUDENT);
        const documentRootId = randomUUID();

        const res = await request(app)
            .post(`${API_URL}/users/${user.id}/documentRoots`)
            .send({
                documentRootIds: [documentRootId]
            });
        expect(res.status).toBe(401);
    });

    it('rejects user to fetch others documents', async () => {
        const user = await createTestUser(Role.STUDENT);
        const otherUser = await createTestUser(Role.STUDENT);
        const documentRootId = randomUUID();

        const agent = agentAs(user.id);

        const res = await agent.post(`${API_URL}/users/${otherUser.id}/documentRoots`).send({
            documentRootIds: [documentRootId]
        });
        expect(res.status).toBe(403);
    });

    it('only allows an admin to delete a document root', async () => {
        const student = await createTestUser(Role.STUDENT);
        const admin = await createTestUser(Role.ADMIN);

        const documentRootId = randomUUID();
        await agentAs(student.id)
            .post(`${API_URL}/documentRoots/${documentRootId}`)
            .send({ access: Access.RW_DocumentRoot });

        const forbidden = await agentAs(student.id).delete(`${API_URL}/documentRoots/${documentRootId}`);
        expect(forbidden.status).toBe(403);

        const ok = await agentAs(admin.id).delete(`${API_URL}/documentRoots/${documentRootId}`);
        expect(ok.status).toBe(200);
    });
});
