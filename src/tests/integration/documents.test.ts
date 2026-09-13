import { randomUUID } from 'crypto';
import { describe, expect, it } from 'vitest';
import { Access } from '../../../prisma/generated/enums.js';
import { Role } from '../../models/User.js';
import { API_URL, agentAs, createTestUser } from './helpers.js';

describe('Documents (integration)', () => {
    it('creates, reads, updates and deletes a document', async () => {
        const user = await createTestUser(Role.STUDENT);
        const agent = agentAs(user.id);

        const documentRootId = randomUUID();
        await agent
            .post(`${API_URL}/documentRoots/${documentRootId}`)
            .send({ access: Access.RW_DocumentRoot });

        const createRes = await agent.post(`${API_URL}/documents`).send({
            type: 'test-type',
            documentRootId,
            data: { foo: 'bar' }
        });
        expect(createRes.status).toBe(200);
        expect(createRes.body.documentRootId).toBe(documentRootId);
        expect(createRes.body.authorId).toBe(user.id);
        expect(createRes.body.data).toEqual({ foo: 'bar' });
        const documentId = createRes.body.id as string;

        const getRes = await agent.get(`${API_URL}/documents/${documentId}`);
        expect(getRes.status).toBe(200);
        // GET /documents/:id returns { document, highestPermission }
        expect(getRes.body.document.data).toEqual({ foo: 'bar' });

        const updateRes = await agent
            .put(`${API_URL}/documents/${documentId}`)
            .send({ data: { foo: 'baz' } });
        expect(updateRes.status).toBe(204);

        const getAfterUpdate = await agent.get(`${API_URL}/documents/${documentId}`);
        expect(getAfterUpdate.body.document.data).toEqual({ foo: 'baz' });

        const deleteRes = await agent.delete(`${API_URL}/documents/${documentId}`);
        expect(deleteRes.status).toBe(204);

        const getAfterDelete = await agent.get(`${API_URL}/documents/${documentId}`);
        expect(getAfterDelete.status).toBe(200);
        expect(getAfterDelete.body).toBeNull();
    });

    it('does not allow a user without access to read another users document data', async () => {
        const owner = await createTestUser(Role.STUDENT);
        const stranger = await createTestUser(Role.STUDENT);

        const documentRootId = randomUUID();
        await agentAs(owner.id)
            .post(`${API_URL}/documentRoots/${documentRootId}`)
            .send({ access: Access.RW_DocumentRoot, sharedAccess: Access.None_DocumentRoot });

        const createRes = await agentAs(owner.id)
            .post(`${API_URL}/documents`)
            .send({
                type: 'test-type',
                documentRootId,
                data: { secret: true }
            });
        expect(createRes.status).toBe(200);
        const documentId = createRes.body.id as string;

        const strangerRes = await agentAs(stranger.id).get(`${API_URL}/documents/${documentId}`);
        expect(strangerRes.status).toBe(200);
        expect(strangerRes.body).toBeNull();
    });
});
