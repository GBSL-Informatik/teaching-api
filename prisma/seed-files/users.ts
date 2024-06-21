import { Prisma, Role } from '@prisma/client';
import Logger from '../../src/utils/logger';

export const FOO_BAR_ID = '96651c13-3af6-4cc0-b242-ea38d438dc41';
export const TEST_USER_ID = '4b6d8b5d-3b6c-4c8b-8d3c-6f2c3f6e2b4b';

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
    }
];

if (USER_EMAIL && USER_ID) {
    const name = USER_EMAIL.split('@')[0];
    users.push({
        email: USER_EMAIL,
        id: USER_ID,
        firstName: name.split('.')[0],
        lastName: name.split('.')[1] || name,
        role: Object.values(Role).includes(process.env.USER_ROLE as Role) ? process.env.USER_ROLE as Role : Role.STUDENT
    });
}

export { users };
