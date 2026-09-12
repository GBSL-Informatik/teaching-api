import { afterAll, vi } from 'vitest';
import prisma from '../../prisma.js';

/**
 * The real auth flow relies on better-auth cookies/sessions. For integration tests we
 * bypass that and resolve the acting user directly from the `x-test-user-id` header,
 * see `agentAs` in ./helpers.ts.
 */
vi.mock('../../auth.js', () => ({
    auth: {
        api: {
            getSession: async ({ headers }: { headers: Headers }) => {
                const userId = headers.get('x-test-user-id');
                if (!userId) {
                    return null;
                }
                const { default: testPrisma } = await import('../../prisma.js');
                const user = await testPrisma.user.findUnique({ where: { id: userId } });
                if (!user) {
                    return null;
                }
                return { user, session: { id: 'test-session', userId: user.id } };
            }
        }
    }
}));

// socket.io is not started in the test process, so notifications are no-ops
vi.mock('../../socketIoServer.js', () => ({
    initialize: vi.fn(),
    getIo: vi.fn(),
    notify: vi.fn()
}));

afterAll(async () => {
    await prisma.$disconnect();
});
