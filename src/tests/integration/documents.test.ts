import { randomUUID } from 'crypto';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { Prisma } from '../../../prisma/generated/client.js';
import { Access } from '../../../prisma/generated/enums.js';
import app from '../../app.js';
import Document, { type UniquenessConstraints } from '../../models/Document.js';
import { Role } from '../../models/User.js';
import prisma from '../../prisma.js';
import { IoEvent, RecordType } from '../../routes/socketEventTypes.js';
import { IoRoom } from '../../routes/socketEvents.js';
import { notify } from '../../socketIoServer.js';
import { HTTP403Error } from '../../utils/errors/Errors.js';
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
        expect(createRes.status).toBe(201);
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
        expect(createRes.status).toBe(201);
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
        expect(createRes.status).toBe(201);
        expect(strangersDocRes.status).toBe(201);
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

describe('Document constraint updates', () => {
    const createFixture = async (constraints: UniquenessConstraints = {}) => {
        const owner = await createTestUser();
        const agent = agentAs(owner.id);
        const documentRootId = randomUUID();
        const root = await agent
            .post(`${API_URL}/documentRoots/${documentRootId}`)
            .send({ access: Access.RW_DocumentRoot, sharedAccess: Access.RW_DocumentRoot });
        expect(root.status).toBe(201);
        const parent = await agent.post(`${API_URL}/documents`).send({
            type: 'constraint-parent',
            documentRootId,
            data: { title: 'Parent' }
        });
        expect(parent.status).toBe(201);
        const created = await agent.post(`${API_URL}/documents`).send({
            type: 'constraint-test',
            documentRootId,
            parentId: parent.body.id,
            data: { answer: 'unchanged' },
            ...constraints
        });
        expect(created.status).toBe(201);
        const document = await prisma.document.findUniqueOrThrow({ where: { id: created.body.id } });
        vi.mocked(notify).mockClear();
        return {
            owner,
            agent,
            document,
            endpoint: `${API_URL}/documents/${document.id}/constraints`
        };
    };

    const expectUnchanged = async (document: Awaited<ReturnType<typeof createFixture>>['document']) => {
        expect(await prisma.document.findUniqueOrThrow({ where: { id: document.id } })).toEqual(document);
        expect(notify).not.toHaveBeenCalled();
    };

    it.each([
        { name: 'root', first: { uniqOnRoot: 'main' }, replacement: { uniqOnRoot: 'new-main' } },
        { name: 'parent', first: { uniqOnParent: 'answer' }, replacement: { uniqOnParent: 'new-answer' } },
        {
            name: 'both',
            first: { uniqOnRoot: 'main', uniqOnParent: 'answer' },
            replacement: { uniqOnRoot: 'new-main', uniqOnParent: 'new-answer' }
        }
    ])(
        'sets and replaces $name constraints, returning and persisting the document',
        async ({ first, replacement }) => {
            const { agent, document, endpoint } = await createFixture();
            for (const data of [first, replacement]) {
                const updated = await agent.put(endpoint).send({ data });
                expect(updated.status).toBe(200);
                expect(updated.body).toMatchObject({
                    id: document.id,
                    authorId: document.authorId,
                    type: document.type,
                    documentRootId: document.documentRootId,
                    parentId: document.parentId,
                    data: document.data,
                    createdAt: document.createdAt.toISOString(),
                    ...data
                });
                expect(updated.body).not.toHaveProperty('documentRoot');
                expect(updated.body.updatedAt).toEqual(expect.any(String));
                const fetched = await agent.get(`${API_URL}/documents/${document.id}`);
                expect(fetched.status).toBe(200);
                expect(fetched.body.document).toEqual(updated.body);
                expect(await prisma.document.findUniqueOrThrow({ where: { id: document.id } })).toMatchObject(
                    data
                );
            }
        }
    );

    it.each(['uniqOnRoot', 'uniqOnParent'] as const)(
        'preserves other fields when updating only %s',
        async (field) => {
            const { agent, document, endpoint } = await createFixture({
                uniqOnRoot: 'main',
                uniqOnParent: 'answer'
            });
            const updated = await agent.put(endpoint).send({ data: { [field]: 'replacement' } });
            expect(updated.status).toBe(200);
            const persisted = await prisma.document.findUniqueOrThrow({ where: { id: document.id } });
            expect(persisted).toEqual({
                ...document,
                [field]: 'replacement',
                updatedAt: persisted.updatedAt
            });
            expect(updated.body).toMatchObject({
                uniqOnRoot: persisted.uniqOnRoot,
                uniqOnParent: persisted.uniqOnParent,
                data: document.data,
                authorId: document.authorId,
                type: document.type,
                documentRootId: document.documentRootId,
                parentId: document.parentId
            });
        }
    );

    it.each([
        { name: 'root', data: { uniqOnRoot: null }, cleared: ['uniqOnRoot'] },
        { name: 'parent', data: { uniqOnParent: null }, cleared: ['uniqOnParent'] },
        {
            name: 'both',
            data: { uniqOnRoot: null, uniqOnParent: null },
            cleared: ['uniqOnRoot', 'uniqOnParent']
        }
    ] as const)('clears $name constraints with null', async ({ data, cleared }) => {
        const { agent, document, endpoint } = await createFixture({
            uniqOnRoot: 'main',
            uniqOnParent: 'answer'
        });
        const updated = await agent.put(endpoint).send({ data });
        expect(updated.status).toBe(200);
        const persisted = await prisma.document.findUniqueOrThrow({ where: { id: document.id } });
        expect(persisted).toEqual({ ...document, ...data, updatedAt: persisted.updatedAt });
        for (const field of cleared) {
            expect(persisted[field]).toBeNull();
            expect(updated.body).not.toHaveProperty(field);
        }
        const fetched = await agent.get(`${API_URL}/documents/${document.id}`);
        expect(fetched.status).toBe(200);
        expect(fetched.body.document).toEqual(updated.body);
    });

    it.each([Role.STUDENT, Role.TEACHER, Role.ADMIN])(
        'rejects a non-author %s even with RW access',
        async (role) => {
            const { document, endpoint } = await createFixture({ uniqOnRoot: 'main' });
            const other = await createTestUser(role);
            const agent = agentAs(other.id);
            const fetched = await agent.get(`${API_URL}/documents/${document.id}`);
            expect(fetched.status).toBe(200);
            expect(fetched.body.highestPermission).toBe(Access.RW_DocumentRoot);
            const updated = await agent.put(endpoint).send({ data: { uniqOnRoot: null } });
            expect(updated.status).toBe(403);
            await expectUnchanged(document);
        }
    );

    it.each([Access.RO_DocumentRoot, Access.None_DocumentRoot])(
        'rejects the author with %s access',
        async (access) => {
            const { agent, document, endpoint } = await createFixture({ uniqOnRoot: 'main' });
            await prisma.documentRoot.update({ where: { id: document.documentRootId }, data: { access } });
            const fetched = await agent.get(`${API_URL}/documents/${document.id}`);
            expect(fetched.status).toBe(200);
            expect(fetched.body.highestPermission).toBe(access);
            const updated = await agent.put(endpoint).send({ data: { uniqOnRoot: null } });
            expect(updated.status).toBe(403);
            await expectUnchanged(document);
        }
    );

    it('returns 404 for a nonexistent document', async () => {
        const owner = await createTestUser();
        vi.mocked(notify).mockClear();
        const updated = await agentAs(owner.id)
            .put(`${API_URL}/documents/${randomUUID()}/constraints`)
            .send({ data: { uniqOnRoot: 'main' } });
        expect(updated.status).toBe(404);
        expect(notify).not.toHaveBeenCalled();
    });

    it('returns 401 without authentication', async () => {
        const { document, endpoint } = await createFixture({ uniqOnRoot: 'main' });
        const updated = await request(app)
            .put(endpoint)
            .send({ data: { uniqOnRoot: null } });
        expect(updated.status).toBe(401);
        await expectUnchanged(document);
    });

    it.each(['uniqOnRoot', 'uniqOnParent'] as const)(
        'rejects a conflicting %s without changing either document',
        async (field) => {
            const { agent, document, endpoint } = await createFixture({ [field]: 'original' });
            const created = await agent.post(`${API_URL}/documents`).send({
                type: document.type,
                documentRootId: document.documentRootId,
                parentId: document.parentId,
                data: { answer: 'other' },
                [field]: 'taken'
            });
            expect(created.status).toBe(201);
            const other = await prisma.document.findUniqueOrThrow({ where: { id: created.body.id } });
            vi.mocked(notify).mockClear();
            const updated = await agent.put(endpoint).send({ data: { [field]: 'taken' } });
            expect(updated.status).toBeGreaterThanOrEqual(400);
            await expectUnchanged(document);
            await expectUnchanged(other);
        }
    );

    it('notifies clients with the cleaned document after a successful update', async () => {
        const { owner, agent, document, endpoint } = await createFixture({ uniqOnRoot: 'main' });
        const updated = await agent
            .put(endpoint)
            .set('x-metadata-sid', 'constraint-update-socket')
            .send({ data: { uniqOnRoot: null, uniqOnParent: 'answer' } });
        expect(updated.status).toBe(200);
        expect(notify).toHaveBeenCalledTimes(1);
        expect(notify).toHaveBeenCalledWith(
            {
                event: IoEvent.CHANGED_RECORD,
                message: {
                    type: RecordType.Document,
                    record: {
                        ...updated.body,
                        createdAt: new Date(updated.body.createdAt),
                        updatedAt: new Date(updated.body.updatedAt)
                    }
                },
                to: expect.arrayContaining([owner.id, IoRoom.ADMIN, IoRoom.ALL])
            },
            'constraint-update-socket'
        );
        expect(updated.body).not.toHaveProperty('documentRoot');
        expect(updated.body).not.toHaveProperty('uniqOnRoot');
        expect(updated.body.parentId).toBe(document.parentId);
    });
});

describe('Document main cleanup', () => {
    const createFixture = async () => {
        const owner = await createTestUser();
        const root = await prisma.documentRoot.create({ data: { id: randomUUID() } });
        const type = 'cleanup-test';
        // Seed legacy rows directly so fixture creation does not trigger cleanup.
        const createDocument = (overrides: Partial<Prisma.DocumentUncheckedCreateInput> = {}) =>
            prisma.document.create({
                data: {
                    authorId: owner.id,
                    documentRootId: root.id,
                    type,
                    data: { text: 'short' },
                    ...overrides
                }
            });
        const requestMain = () =>
            agentAs(owner.id)
                .post(`${API_URL}/documents`)
                .send({
                    documentRootId: root.id,
                    type,
                    uniqOnRoot: 'main',
                    data: { text: 'new request data must not replace existing data' }
                });
        return { owner, root, type, createDocument, requestMain };
    };

    it.each([
        { name: 'object', data: { text: 'legacy' }, expected: { text: 'legacy' } },
        { name: 'JSON null', data: Prisma.JsonNull, expected: null }
    ])(
        'promotes a single legacy document with $name data and commits before P2002',
        async ({ data, expected }) => {
            const { owner, root, type, createDocument } = await createFixture();
            const legacy = await createDocument({ data });

            await expect(
                Document.createModel(owner, type, root.id, { text: 'new' }, undefined, 'main')
            ).rejects.toMatchObject({
                code: 'P2002'
            });

            expect(await prisma.document.findMany({ where: { documentRootId: root.id } })).toEqual([
                expect.objectContaining({
                    id: legacy.id,
                    data: expected,
                    uniqOnRoot: 'main',
                    createdAt: legacy.createdAt
                })
            ]);
        }
    );

    it('retains the oldest legacy ID, selects the largest payload, and returns it without creating a row', async () => {
        const { root, createDocument, requestMain } = await createFixture();
        const oldest = await createDocument({ createdAt: new Date('2020-01-01') });
        const largestData = { text: 'the longest saved document content' };
        await createDocument({ data: largestData, createdAt: new Date('2020-01-02') });
        await createDocument({ data: { text: 'medium' }, createdAt: new Date('2020-01-03') });

        const response = await requestMain();

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({ id: oldest.id, data: largestData, uniqOnRoot: 'main' });
        expect(await prisma.document.findMany({ where: { documentRootId: root.id } })).toEqual([
            expect.objectContaining({ id: oldest.id, data: largestData, uniqOnRoot: 'main' })
        ]);
    });

    it.each(['2020-01-01', '2020-01-03', '2020-01-05'])(
        'leaves all documents unchanged when a main exists with creation date %s',
        async (mainCreatedAt) => {
            const { root, createDocument, requestMain } = await createFixture();
            const legacy = await createDocument({
                data: { text: 'the longest saved document content' },
                createdAt: new Date('2020-01-02')
            });
            const main = await createDocument({ uniqOnRoot: 'main', createdAt: new Date(mainCreatedAt) });
            await createDocument({ createdAt: new Date('2020-01-04') });
            await createDocument({ parentId: main.id, type: 'child', uniqOnParent: 'q1' });
            await createDocument({ parentId: legacy.id, type: 'child', uniqOnParent: 'q1' });
            const child = await createDocument({ parentId: legacy.id, type: 'child' });
            await createDocument({ parentId: child.id, type: 'grandchild' });
            const query = { where: { documentRootId: root.id }, orderBy: { id: 'asc' as const } };
            const before = await prisma.document.findMany(query);

            const response = await requestMain();

            expect(response.status).toBe(200);
            expect(response.body).toMatchObject({ id: main.id, data: main.data, uniqOnRoot: 'main' });
            expect(await prisma.document.findMany(query)).toEqual(before);
        }
    );

    it('moves unconstrained children and preserves their descendants while deleting constrained children', async () => {
        const { createDocument, requestMain } = await createFixture();
        const main = await createDocument({ createdAt: new Date('2020-01-01') });
        const duplicate = await createDocument({ createdAt: new Date('2020-01-02') });
        const child = await createDocument({ parentId: duplicate.id, type: 'child' });
        const grandchild = await createDocument({
            parentId: child.id,
            type: 'grandchild',
            uniqOnParent: 'answer'
        });
        const retainedChild = await createDocument({ parentId: main.id, type: 'child', uniqOnParent: 'q1' });
        const conflictingChild = await createDocument({
            parentId: duplicate.id,
            type: 'child',
            uniqOnParent: 'q1'
        });
        const distinctConstrainedChild = await createDocument({
            parentId: duplicate.id,
            type: 'child',
            uniqOnParent: 'q2'
        });
        const deletedGrandchild = await createDocument({ parentId: conflictingChild.id, type: 'grandchild' });

        const response = await requestMain();

        expect(response.status).toBe(200);
        expect(response.body.id).toBe(main.id);
        expect(await prisma.document.findUniqueOrThrow({ where: { id: child.id } })).toMatchObject({
            id: child.id,
            parentId: main.id,
            data: child.data,
            uniqOnParent: null
        });
        expect(await prisma.document.findUniqueOrThrow({ where: { id: grandchild.id } })).toEqual(grandchild);
        expect(await prisma.document.findUniqueOrThrow({ where: { id: retainedChild.id } })).toEqual(
            retainedChild
        );
        expect(
            await prisma.document.findMany({
                where: {
                    id: {
                        in: [
                            duplicate.id,
                            conflictingChild.id,
                            distinctConstrainedChild.id,
                            deletedGrandchild.id
                        ]
                    }
                }
            })
        ).toEqual([]);
    });

    it.each([
        { name: 'read-only root', rootAccess: Access.RO_DocumentRoot, allowed: false },
        { name: 'no root access', rootAccess: Access.None_DocumentRoot, allowed: false },
        {
            name: 'read-only user override',
            rootAccess: Access.RW_DocumentRoot,
            userAccess: Access.RO_User,
            allowed: false
        },
        {
            name: 'no-access user override',
            rootAccess: Access.RW_DocumentRoot,
            userAccess: Access.None_User,
            allowed: false
        },
        {
            name: 'read-only group override',
            rootAccess: Access.RW_DocumentRoot,
            groupAccess: Access.RO_StudentGroup,
            allowed: false
        },
        {
            name: 'no-access group override',
            rootAccess: Access.RW_DocumentRoot,
            groupAccess: Access.None_StudentGroup,
            allowed: false
        },
        {
            name: 'write user grant',
            rootAccess: Access.RO_DocumentRoot,
            userAccess: Access.RW_User,
            allowed: true
        },
        {
            name: 'write group grant',
            rootAccess: Access.RO_DocumentRoot,
            groupAccess: Access.RW_StudentGroup,
            allowed: true
        },
        {
            name: 'user restriction over write group grant',
            rootAccess: Access.RO_DocumentRoot,
            groupAccess: Access.RW_StudentGroup,
            userAccess: Access.RO_User,
            allowed: false
        }
    ])(
        'requires effective RW permission for cleanup: $name',
        async ({ rootAccess, userAccess, groupAccess, allowed }) => {
            const { owner, root, createDocument, requestMain } = await createFixture();
            const oldest = await createDocument({ createdAt: new Date('2020-01-01') });
            const largestData = { text: 'the longest saved document content' };
            const duplicate = await createDocument({ data: largestData });
            const child = await createDocument({ parentId: duplicate.id, type: 'child' });
            const constrainedChild = await createDocument({
                parentId: duplicate.id,
                type: 'child',
                uniqOnParent: 'q1'
            });
            await createDocument({ parentId: constrainedChild.id, type: 'grandchild' });
            await prisma.documentRoot.update({ where: { id: root.id }, data: { access: rootAccess } });
            if (userAccess) {
                await prisma.rootUserPermission.create({
                    data: { documentRootId: root.id, userId: owner.id, access: userAccess }
                });
            }
            if (groupAccess) {
                const group = await createTestStudentGroup('Cleanup permissions', [], [owner.id]);
                await prisma.rootGroupPermission.create({
                    data: { documentRootId: root.id, studentGroupId: group.id, access: groupAccess }
                });
            }
            const query = { where: { documentRootId: root.id }, orderBy: { id: 'asc' as const } };
            const before = await prisma.document.findMany(query);

            const response = await requestMain();

            if (!allowed) {
                expect(response.status).toBe(403);
                expect(await prisma.document.findMany(query)).toEqual(before);
                return;
            }
            expect(response.status).toBe(200);
            expect(response.body).toMatchObject({ id: oldest.id, data: largestData, uniqOnRoot: 'main' });
            expect(await prisma.document.findMany(query)).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({ id: oldest.id, data: largestData, uniqOnRoot: 'main' }),
                    expect.objectContaining({ id: child.id, parentId: oldest.id })
                ])
            );
            expect(await prisma.document.count({ where: { documentRootId: root.id } })).toBe(2);
        }
    );

    it('returns an existing main without changing documents when the author has read-only access', async () => {
        const { root, createDocument, requestMain } = await createFixture();
        const main = await createDocument({ uniqOnRoot: 'main' });
        await createDocument({ data: { text: 'a larger legacy payload' } });
        await prisma.documentRoot.update({
            where: { id: root.id },
            data: { access: Access.RO_DocumentRoot }
        });
        const query = { where: { documentRootId: root.id }, orderBy: { id: 'asc' as const } };
        const before = await prisma.document.findMany(query);

        const response = await requestMain();

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({ id: main.id, data: main.data });
        expect(await prisma.document.findMany(query)).toEqual(before);
    });

    it.each([
        { sharedAccess: Access.None_DocumentRoot, allowed: false },
        { sharedAccess: Access.RO_DocumentRoot, allowed: false },
        { sharedAccess: Access.RW_DocumentRoot, allowed: true }
    ])(
        'requires RW access for on-behalf-of cleanup with $sharedAccess',
        async ({ sharedAccess, allowed }) => {
            const { owner, root, type, createDocument } = await createFixture();
            const admin = await createTestUser(Role.ADMIN);
            const oldest = await createDocument({ createdAt: new Date('2020-01-01') });
            const largestData = { text: 'the longest saved document content' };
            await createDocument({ data: largestData });
            await prisma.documentRoot.update({ where: { id: root.id }, data: { sharedAccess } });
            const query = { where: { documentRootId: root.id }, orderBy: { id: 'asc' as const } };
            const before = await prisma.document.findMany(query);

            const cleanup = Document.createModel(
                admin,
                type,
                root.id,
                { text: 'new' },
                undefined,
                'main',
                undefined,
                owner.id
            );

            if (!allowed) {
                await expect(cleanup).rejects.toBeInstanceOf(HTTP403Error);
                expect(await prisma.document.findMany(query)).toEqual(before);
                return;
            }
            await expect(cleanup).rejects.toMatchObject({ code: 'P2002' });
            expect(await prisma.document.findMany(query)).toEqual([
                expect.objectContaining({
                    id: oldest.id,
                    authorId: owner.id,
                    data: largestData,
                    uniqOnRoot: 'main'
                })
            ]);
        }
    );

    it('does not clean up legacy documents when creating a different uniqueness key', async () => {
        const { owner, root, type, createDocument } = await createFixture();
        const legacy = [await createDocument(), await createDocument()];

        const result = await Document.createModel(
            owner,
            type,
            root.id,
            { text: 'secondary' },
            undefined,
            'secondary'
        );

        expect(result.model).toMatchObject({ uniqOnRoot: 'secondary', data: { text: 'secondary' } });
        expect(await prisma.document.count({ where: { documentRootId: root.id } })).toBe(3);
        for (const document of legacy) {
            expect(await prisma.document.findUniqueOrThrow({ where: { id: document.id } })).toEqual(document);
        }
    });
});

describe('Document creation', () => {
    it('prevents creating multiple main documents for the same document root', async () => {
        const user = await createTestUser(Role.STUDENT);
        const agent = agentAs(user.id);

        const documentRootId = randomUUID();
        await agent
            .post(`${API_URL}/documentRoots/${documentRootId}`)
            .send({ access: Access.RW_DocumentRoot });

        const createRes = await agent.post(`${API_URL}/documents`).send({
            type: 'test-type',
            documentRootId,
            data: { foo: 'bar' },
            uniqOnRoot: 'main'
        });
        expect(createRes.status).toBe(201);
        expect(createRes.body.documentRootId).toBe(documentRootId);
        expect(createRes.body.authorId).toBe(user.id);
        expect(createRes.body.data).toEqual({ foo: 'bar' });
        expect(createRes.body.uniqOnRoot).toBe('main');
        expect(createRes.body.uniqOnParent).toBeUndefined();

        const createSecond = await agent.post(`${API_URL}/documents`).send({
            type: 'test-type',
            documentRootId,
            data: { foo: 'another bar' },
            uniqOnRoot: 'main'
        });
        expect(createSecond.status).toBe(200);
        expect(createSecond.body.documentRootId).toBe(documentRootId);
        expect(createSecond.body.authorId).toBe(user.id);
        expect(createSecond.body.data).toEqual({ foo: 'bar' });
        expect(createSecond.body.uniqOnRoot).toBe('main');
        expect(createSecond.body.uniqOnParent).toBeUndefined();

        const createDifferentType = await agent.post(`${API_URL}/documents`).send({
            type: 'demo-type',
            documentRootId,
            data: { foo: 'another bar' },
            uniqOnRoot: 'main'
        });
        expect(createDifferentType.status).toBe(201);
        expect(createDifferentType.body.documentRootId).toBe(documentRootId);
        expect(createDifferentType.body.authorId).toBe(user.id);
        expect(createDifferentType.body.data).toEqual({ foo: 'another bar' });
        expect(createDifferentType.body.uniqOnRoot).toBe('main');
        expect(createDifferentType.body.uniqOnParent).toBeUndefined();
    });
    it('prevents creating multiple child documents for the same parent document', async () => {
        const user = await createTestUser(Role.STUDENT);
        const agent = agentAs(user.id);

        const documentRootId = randomUUID();
        await agent
            .post(`${API_URL}/documentRoots/${documentRootId}`)
            .send({ access: Access.RW_DocumentRoot });

        const parentDoc = await agent.post(`${API_URL}/documents`).send({
            type: 'quiz',
            documentRootId,
            data: { foo: 'bar' },
            uniqOnRoot: 'main'
        });
        expect(parentDoc.status).toBe(201);
        expect(parentDoc.body.documentRootId).toBe(documentRootId);

        const createChild = await agent.post(`${API_URL}/documents`).send({
            type: 'choice_answer',
            documentRootId,
            parentId: parentDoc.body.id,
            data: { qid: 'q1' },
            uniqOnParent: 'q1'
        });
        expect(createChild.status).toBe(201);
        expect(createChild.body.parentId).toBe(parentDoc.body.id);
        expect(createChild.body.uniqOnParent).toBe('q1');
        expect(createChild.body.data.qid).toBe('q1');

        const createSecond = await agent.post(`${API_URL}/documents`).send({
            type: 'choice_answer',
            documentRootId,
            parentId: parentDoc.body.id,
            data: { qid: 'q-whatever-doesnt-matter' },
            uniqOnParent: 'q1'
        });
        expect(createSecond.status).toBe(200);
        expect(createSecond.body.parentId).toBe(parentDoc.body.id);
        expect(createSecond.body.uniqOnParent).toBe('q1');
        expect(createSecond.body.data.qid).toBe('q1');

        const createQ2 = await agent.post(`${API_URL}/documents`).send({
            type: 'demo-type',
            documentRootId,
            parentId: parentDoc.body.id,
            data: { qid: 'q2' },
            uniqOnParent: 'q2'
        });
        expect(createQ2.status).toBe(201);
        expect(createQ2.body.documentRootId).toBe(documentRootId);
        expect(createQ2.body.authorId).toBe(user.id);
        expect(createQ2.body.parentId).toBe(parentDoc.body.id);
        expect(createQ2.body.uniqOnParent).toBe('q2');
        expect(createQ2.body.data.qid).toBe('q2');
    });
});
