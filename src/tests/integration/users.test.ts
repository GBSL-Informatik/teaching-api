import { randomUUID } from 'crypto';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { Access } from '../../../prisma/generated/enums.js';
import app from '../../app.js';
import { Role } from '../../models/User.js';
import prisma from '../../prisma.js';
import { API_URL, agentAs, createTestUser } from './helpers.js';

describe('Users (integration)', () => {
    it('returns the authenticated user and allows looking it up by id', async () => {
        const user = await createTestUser(Role.STUDENT);
        const agent = agentAs(user.id);

        const currentUserRes = await agent.get(`${API_URL}/user`);
        expect(currentUserRes.status).toBe(200);
        expect(currentUserRes.body.id).toBe(user.id);
        expect(currentUserRes.body.email).toBe(user.email);

        const findUserRes = await agent.get(`${API_URL}/users/${user.id}`);
        expect(findUserRes.status).toBe(200);
        expect(findUserRes.body.id).toBe(user.id);
        expect(findUserRes.body.email).toBe(user.email);
    });

    it('rejects unauthenticated user requests', async () => {
        const res = await request(app).get(`${API_URL}/users/${randomUUID()}`);

        expect(res.status).toBe(401);
    });

    it('returns document roots for the requested user', async () => {
        const user = await createTestUser(Role.STUDENT);
        const otherUser = await createTestUser(Role.STUDENT);
        const documentRootId = randomUUID();
        const agent = agentAs(user.id);

        const createRootRes = await agent.post(`${API_URL}/documentRoots/${documentRootId}`).send({
            access: Access.RW_DocumentRoot
        });
        expect(createRootRes.status).toBe(200);

        const ownDocumentRes = await agent.post(`${API_URL}/documents`).send({
            type: 'document',
            documentRootId,
            data: { owner: user.id }
        });
        expect(ownDocumentRes.status).toBe(200);

        await prisma.document.create({
            data: {
                type: 'document',
                documentRootId,
                authorId: otherUser.id,
                data: { owner: otherUser.id }
            }
        });

        const res = await agent
            .post(`${API_URL}/users/${user.id}/documentRoots`)
            .send({ documentRootIds: [documentRootId] });

        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(1);
        expect(res.body[0].id).toBe(documentRootId);
        expect(res.body[0].documents).toHaveLength(1);
        expect(res.body[0].documents[0].authorId).toBe(user.id);
        expect(res.body[0].documents[0].data).toEqual({ owner: user.id });
    });

    it('does not allow a user to request another users document roots', async () => {
        const user = await createTestUser(Role.STUDENT);
        const otherUser = await createTestUser(Role.STUDENT);

        const res = await agentAs(user.id)
            .get(`${API_URL}/users/${otherUser.id}/documentRoots`)
            .query({ ids: randomUUID() });

        expect(res.status).toBe(403);
    });
});
