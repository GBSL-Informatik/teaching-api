import { Prisma } from '@prisma/client';
const { USER_EMAIL, USER_ID } = process.env;

export const ALL_USERS_GROUP_ID = '8f60f838-940a-4ab3-bb65-405308b0db6c';
export const ALL_TEST_USERS_GROUP_ID = '106c9621-aed4-4592-a267-0670b5fe420c';
export const RW_GROUP_ID = 'dbf2b348-9732-4772-9689-afcc2d35dec9';
export const RO_GROUP_ID = 'c5696e7b-eeee-4fb0-a40c-b50f651f7c7e';
const groups: Prisma.GroupCreateInput[] = [
    {
        name: 'All Users',
        description: 'All seeded users',
        id: ALL_USERS_GROUP_ID
    },
    {
        name: 'All Test Users',
        description: 'All seeded test users - test@user.ch and foo@bar.ch',
        id: ALL_TEST_USERS_GROUP_ID
    }
];

if (USER_EMAIL && USER_ID) {
    groups.push({
        name: `RW ${USER_EMAIL.split('.')[0]}`,
        description: 'Read access for test users test@user.ch and foo@bar.ch',
        id: RW_GROUP_ID
    });
    groups.push({
        name: `Read ${USER_EMAIL.split('.')[0]}`,
        description: `Read access for ${USER_EMAIL}, Read/Write access for test users test@user.ch and foo@bar.ch`,
        id: RO_GROUP_ID
    });
}

export { groups };
