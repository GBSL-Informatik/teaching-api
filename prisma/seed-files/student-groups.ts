import { FOO_BAR_ID, TEST_USER_ID } from './users';
import { Prisma } from '@prisma/client';

export const ALL_USERS_GROUP_ID = '8f60f838-940a-4ab3-bb65-405308b0db6c';
export const CLASS_GROUP_ID = '106c9621-aed4-4592-a267-0670b5fe420c';
export const PROJECT_GROUP_ID = '58b696a3-7a6c-4745-ae4b-802158af2395';

const studentGroups: Prisma.StudentGroupUncheckedCreateWithoutChildrenInput[] = [
    {
        name: 'All Users',
        description: 'All seeded users',
        id: ALL_USERS_GROUP_ID
    },
    {
        name: 'Test Class',
        description: 'A school class consisting of all seeded test users (test@user.ch and foo@bar.ch)',
        id: CLASS_GROUP_ID
    },
    {
        name: 'Project group A',
        description: 'A project group within Test Class, including foo@bar.ch, but not test@user.ch',
        id: PROJECT_GROUP_ID,
        parentId: CLASS_GROUP_ID
    }
];

export { studentGroups };
