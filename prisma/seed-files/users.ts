import { Prisma } from '@prisma/client';

export const FOO_BAR_ID = '96651c13-3af6-4cc0-b242-ea38d438dc41';
export const TEST_USER_ID = '4b6d8b5d-3b6c-4c8b-8d3c-6f2c3f6e2b4b';
export const LANA_LOCAL_ID = '13f651e0-3bc0-4f05-b5cd-dfed19a03404';

const { USER_EMAIL, USER_ID } = process.env;

const users: Prisma.UserCreateInput[] = [
    {
        email: 'foo@bar.ch',
        id: FOO_BAR_ID,
        firstName: 'Foo',
        lastName: 'Bar'
    },
    {
        email: 'test@user.ch',
        id: TEST_USER_ID,
        firstName: 'Test',
        lastName: 'User'
    },
    {
        email: 'lana@local.ch',
        id: LANA_LOCAL_ID,
        firstName: 'Lana',
        lastName: 'Local',
        localUserCredential: {
            create: {
                /* password123 (bcrypt, 12 rounds) */
                passwordHash: '$2a$12$N7SXui1WlITJRABmXG.fre0QLWr9KF7eyZlhY.Q0friIXYnuW/uCi'
            }
        }
    }
];

// Add admin user from .env-file.
if (USER_EMAIL && USER_ID) {
    const name = USER_EMAIL.split('@')[0];
    users.push({
        email: USER_EMAIL,
        id: USER_ID,
        firstName: name.split('.')[0],
        lastName: name.split('.')[1] || name,
        isAdmin: true
    });
}

export { users };
