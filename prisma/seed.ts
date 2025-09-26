import { Access, PrismaClient, User } from '@prisma/client';
import { FOO_BAR_ID, TEST_USER_ID, users as seedUsers } from './seed-files/users';
import { documents as seedDocuments } from '@/prisma/seed-files/documents';
import {
    ALL_USERS_GROUP_ID,
    CLASS_GROUP_ID,
    PROJECT_GROUP_ID,
    studentGroups as seedStudentGroups
} from '@/prisma/seed-files/student-groups';
import {
    documentRoots as seedDocumentRoots,
    NONE_EXAM_DOCUMENT_ID,
    RW_EXERCISE_IMPSUM_DOCUMENT_ROOT_ID,
    RO_VISIBILITY_WRAPPER_DOCUMENT_ROOT_ID,
    RW_EXERCISE_LOREM_DOCUMENT_ROOT_ID
} from '@/prisma/seed-files/document-roots';
import {
    rootUserPermissions as seedRootUserPermissions,
    rootGroupPermissions as seedRootGroupPermissions
} from '@/prisma/seed-files/document-root-permissions';

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

    const documentRoots = await prisma.documentRoot.createMany({
        data: seedDocumentRoots
    });

    const documents = await prisma.document.createMany({
        data: seedDocuments
    });

    const groups = await prisma.studentGroup.createMany({
        data: seedStudentGroups
    });

    /** Connect users and student groups. */
    // TODO: Is there a more elegant way to add entries to the implicit _StudentGroupToUser join table?
    const allUsersGroupMembers = [{ id: FOO_BAR_ID }, { id: TEST_USER_ID }];
    if (USER_EMAIL && USER_ID) {
        allUsersGroupMembers.push({ id: USER_ID });
    }
    const allUsersGroupUpdate = await prisma.studentGroup.update({
        where: { id: ALL_USERS_GROUP_ID },
        data: {
            users: {
                connectOrCreate: allUsersGroupMembers.map((user) => ({
                    where: {
                        id: { studentGroupId: ALL_USERS_GROUP_ID, userId: user.id }
                    },
                    create: { userId: user.id }
                }))
            }
        }
    });
    const classGroupUpdate = await prisma.studentGroup.update({
        where: { id: CLASS_GROUP_ID },
        data: {
            users: {
                connectOrCreate: [
                    {
                        where: {
                            id: { studentGroupId: CLASS_GROUP_ID, userId: FOO_BAR_ID }
                        },
                        create: { userId: FOO_BAR_ID }
                    },
                    {
                        where: {
                            id: { studentGroupId: CLASS_GROUP_ID, userId: FOO_BAR_ID }
                        },
                        create: { userId: TEST_USER_ID }
                    }
                ]
            }
        }
    });
    const projectGroupUpdate = await prisma.studentGroup.update({
        where: { id: PROJECT_GROUP_ID },
        data: {
            users: {
                connectOrCreate: [
                    {
                        where: {
                            id: { studentGroupId: PROJECT_GROUP_ID, userId: FOO_BAR_ID }
                        },
                        create: { userId: FOO_BAR_ID }
                    }
                ]
            }
        }
    });

    const rootUserPermissions = await prisma.rootUserPermission.createMany({
        data: seedRootUserPermissions
    });

    const rootGroupPermissions = await prisma.rootGroupPermission.createMany({
        data: seedRootGroupPermissions
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
