import { randomUUID } from 'crypto';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import app from '../../app.js';
import { Role } from '../../models/User.js';
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
});
