import { Access, PrismaClient, User } from './generated/client';
import { FOO_BAR_ID, TEST_USER_ID, users as seedUsers } from './seed-files/users';
import { documents as seedDocuments } from './seed-files/documents';
import {
    ALL_USERS_GROUP_ID,
    CLASS_GROUP_ID,
    PROJECT_GROUP_ID,
    studentGroups as seedStudentGroups
} from './seed-files/student-groups';
import { documentRoots as seedDocumentRoots } from './seed-files/document-roots';
import {
    rootUserPermissions as seedRootUserPermissions,
    rootGroupPermissions as seedRootGroupPermissions
} from './seed-files/document-root-permissions';

const prisma = new PrismaClient();

const { USER_ID, USER_EMAIL } = process.env;

async function main() {
    if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'test') {
        return;
    }

    const users = await prisma.user.createMany({
        data: seedUsers.map((user) => ({ ...user, email: user.email.toLowerCase() }))
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
    if (process.env.USER_ID && process.env.USER_EMAIL && process.env.ADMIN_USER_GROUP_ID) {
        await prisma.studentGroup.update({
            where: { id: ALL_USERS_GROUP_ID },
            data: {
                users: {
                    connectOrCreate: seedUsers
                        .filter((u) => u.role === 'admin')
                        .map((user) => ({
                            where: {
                                id: { studentGroupId: ALL_USERS_GROUP_ID, userId: user.id! }
                            },
                            create: { userId: user.id! }
                        }))
                }
            }
        });
    }
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
