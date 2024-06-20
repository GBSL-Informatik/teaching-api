import { PrismaClient, Role, User } from '@prisma/client';
import { FOO_BAR_ID, TEST_USER_ID, users as seedUsers } from './seed-files/users';
import {
    ALL_DOCUMENT_ID,
    RO_DOCUMENT_ID,
    RW_DOCUMENT_ID,
    TEST_DOCUMENT_ID,
    documents as seedDocuments
} from './seed-files/documents';
import {
    ALL_TEST_USERS_GROUP_ID,
    ALL_USERS_GROUP_ID,
    RO_GROUP_ID,
    RW_GROUP_ID,
    groups as seedGroups
} from './seed-files/groups';
const prisma = new PrismaClient();

const { USER_ID, USER_EMAIL } = process.env;

async function main() {
    if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'test') {
        return;
    }
    console.log(seedUsers);
    const users = await prisma.user.createMany({
        data: seedUsers
    });
    const documents = await prisma.document.createMany({
        data: seedDocuments
    });

    const groups = await prisma.group.createMany({
        data: seedGroups
    });

    /** connect groups to docs and users to groups */
    await prisma.groupsOnDocuments.createMany({
        data: [
            {
                groupId: ALL_USERS_GROUP_ID /** All Users */,
                documentId: ALL_DOCUMENT_ID /** Shared Doc All Users */,
                readAccess: 'STUDENT',
                writeAccess: 'STUDENT'
            },
            {
                groupId: ALL_TEST_USERS_GROUP_ID /** Test Users */,
                documentId: TEST_DOCUMENT_ID,
                readAccess: 'STUDENT',
                writeAccess: 'STUDENT'
            }
        ]
    });
    if (USER_ID && USER_EMAIL) {
        /** connect groups to docs and users to groups */
        await prisma.groupsOnDocuments.createMany({
            data: [
                {
                    groupId: RW_GROUP_ID /** RW USER_ID, RO for test users */,
                    documentId:
                        RW_DOCUMENT_ID /** `Shared Read/Write for ${USER_EMAIL}, Read Only for test users` */,
                    readAccess: 'STUDENT',
                    writeAccess: 'ADMIN'
                },
                {
                    groupId: RO_GROUP_ID /** RO USER_ID, RW test users */,
                    documentId: RO_DOCUMENT_ID /** Shared Doc Read Only ${USER_EMAIL}, RW for test users */,
                    readAccess: 'STUDENT',
                    writeAccess: 'TEACHER'
                }
            ]
        });
        await prisma.usersOnGroups.createMany({
            data: [
                /** USER -> RW */
                {
                    userId: USER_ID,
                    groupId: RW_GROUP_ID,
                    role: Role.ADMIN
                },
                /** USER -> RO */
                {
                    userId: USER_ID,
                    groupId: RO_GROUP_ID,
                    role: Role.STUDENT
                },
                /** test users as students -> RW */
                ...[TEST_USER_ID, FOO_BAR_ID].map((uid) => ({
                    userId: uid,
                    groupId: RW_GROUP_ID,
                    role: Role.STUDENT
                })),
                /** test users as teachers -> RO */
                ...[TEST_USER_ID, FOO_BAR_ID].map((uid) => ({
                    userId: uid,
                    groupId: RO_GROUP_ID,
                    role: Role.TEACHER
                }))
            ]
        });
    }
    await prisma.usersOnGroups.createMany({
        data: [
            ...[FOO_BAR_ID, TEST_USER_ID, USER_ID]
                .filter((id) => !!id)
                .map((id) => ({
                    userId: id!,
                    groupId: ALL_USERS_GROUP_ID,
                    role: Role.ADMIN
                })),
            ...[FOO_BAR_ID, TEST_USER_ID]
                .filter((id) => !!id)
                .map((id) => ({
                    userId: id!,
                    groupId: ALL_TEST_USERS_GROUP_ID,
                    role: Role.ADMIN
                }))
        ]
    });
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
