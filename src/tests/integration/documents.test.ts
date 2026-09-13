import { randomUUID } from 'crypto';
import { describe, expect, it } from 'vitest';
import { Access } from '../../../prisma/generated/enums.js';
import { Role } from '../../models/User.js';
import { API_URL, agentAs, createTestStudentGroup, createTestUser } from './helpers.js';

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

    it('[get]/documents/:id does not allow a user without access to read another users document data', async () => {
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

    it('[post]/documents/multiple', async () => {
        const owner = await createTestUser(Role.STUDENT);
        const admin = await createTestUser(Role.ADMIN);
        const teacher1 = await createTestUser(Role.TEACHER);
        const teacher2 = await createTestUser(Role.TEACHER);
        const stranger = await createTestUser(Role.STUDENT);
        await createTestStudentGroup('Test Group', [teacher1.id], [owner.id]);
        const group = await agentAs(teacher1.id).get(`${API_URL}/studentGroups`);
        expect(group.status).toBe(200);
        expect(group.body.length).toBe(1);
        expect(group.body[0].name).toBe('Test Group');
        expect(group.body[0].userIds).toEqual(expect.arrayContaining([owner.id, teacher1.id]));
        expect(group.body[0].adminIds).toEqual(expect.arrayContaining([teacher1.id]));

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
        const strangersDocRes = await agentAs(stranger.id)
            .post(`${API_URL}/documents`)
            .send({
                type: 'test-type',
                documentRootId,
                data: { secret: true }
            });
        expect(createRes.status).toBe(200);
        expect(strangersDocRes.status).toBe(200);
        const documentId = createRes.body.id as string;
        const strangersDocumentId = strangersDocRes.body.id as string;

        const ownerRes = await agentAs(owner.id)
            .post(`${API_URL}/documents/multiple`)
            .send({
                documentRootIds: [documentRootId],
                userId: owner.id
            });
        expect(ownerRes.status).toBe(200);
        expect(ownerRes.body.length).toBe(1);
        expect(ownerRes.body[0].id).toBe(documentId);

        const strangerRes = await agentAs(stranger.id)
            .post(`${API_URL}/documents/multiple`)
            .send({
                documentRootIds: [documentRootId],
                userId: owner.id
            });
        expect(strangerRes.status).toBe(403);

        // requesting docs for one user

        const adminRes = await agentAs(admin.id)
            .post(`${API_URL}/documents/multiple`)
            .send({
                documentRootIds: [documentRootId],
                userId: owner.id
            });
        expect(adminRes.status).toBe(200);
        expect(adminRes.body.length).toBe(1);
        expect(adminRes.body[0].id).toBe(documentId);

        const teacher1Res = await agentAs(teacher1.id)
            .post(`${API_URL}/documents/multiple`)
            .send({
                documentRootIds: [documentRootId],
                userId: owner.id
            });
        expect(teacher1Res.status).toBe(200);
        expect(teacher1Res.body.length).toBe(1);
        expect(teacher1Res.body[0].id).toBe(documentId);

        const teacher2Res = await agentAs(teacher2.id)
            .post(`${API_URL}/documents/multiple`)
            .send({
                documentRootIds: [documentRootId],
                userId: owner.id
            });
        expect(teacher2Res.status).toBe(200);
        expect(teacher2Res.body.length).toBe(0);

        // requesting all docs of this document root
        const adminRes2 = await agentAs(admin.id)
            .post(`${API_URL}/documents/multiple`)
            .send({
                documentRootIds: [documentRootId]
            });
        expect(adminRes2.status).toBe(200);
        expect(adminRes2.body.length).toBe(2);
        expect(adminRes2.body.map((d: { id: string }) => d.id)).toEqual(
            expect.arrayContaining([documentId, strangersDocumentId])
        );

        const teacher1Res2 = await agentAs(teacher1.id)
            .post(`${API_URL}/documents/multiple`)
            .send({
                documentRootIds: [documentRootId]
            });
        expect(teacher1Res2.status).toBe(200);
        expect(teacher1Res2.body.length).toBe(1);
        expect(teacher1Res2.body[0].id).toBe(documentId);

        const teacher2Res2 = await agentAs(teacher2.id)
            .post(`${API_URL}/documents/multiple`)
            .send({
                documentRootIds: [documentRootId]
            });
        expect(teacher2Res2.status).toBe(200);
        expect(teacher2Res2.body.length).toBe(0);
    });
});
