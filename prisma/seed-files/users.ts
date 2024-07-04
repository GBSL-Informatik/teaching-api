import { Prisma } from '@prisma/client';

export const FOO_BAR_ID = '96651c13-3af6-4cc0-b242-ea38d438dc41';
export const TEST_USER_ID = '4b6d8b5d-3b6c-4c8b-8d3c-6f2c3f6e2b4b';

const { USER_EMAIL, USER_ID } = process.env;

const users = [
    {
        email: 'foo@bar.ch',
        id: FOO_BAR_ID
    },
    {
        email: 'test@user.ch',
        id: TEST_USER_ID
    }
] satisfies Prisma.UserCreateInput[];

if (USER_EMAIL && USER_ID) {
    users.push({
        email: USER_EMAIL,
        id: USER_ID
    });
}

export { users };
