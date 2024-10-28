import {PrismaClient} from '@prisma/client';
import {FOO_BAR_ID, LANA_LOCAL_ID, TEST_USER_ID, users as seedUsers} from './seed-files/users';
import {documents as seedDocuments} from './seed-files/documents';
import {
    ALL_USERS_GROUP_ID,
    CLASS_GROUP_ID,
    PROJECT_GROUP_ID,
    studentGroups as seedStudentGroups
} from './seed-files/student-groups';
import {documentRoots as seedDocumentRoots} from './seed-files/document-roots';
import {
    rootGroupPermissions as seedRootGroupPermissions,
    rootUserPermissions as seedRootUserPermissions
} from './seed-files/document-root-permissions';

const prisma = new PrismaClient();

const { USER_ID, USER_EMAIL } = process.env;

async function main() {
    if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'test') {
        return;
    }

    console.log(seedUsers);
    for (const seedUser of seedUsers) {
        await prisma.user.create({data: seedUser});
    }

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
    const allUsersGroupMembers = [{ id: FOO_BAR_ID }, { id: TEST_USER_ID }, { id: LANA_LOCAL_ID }];
    if (USER_EMAIL && USER_ID) {
        allUsersGroupMembers.push({ id: USER_ID });
    }
    const allUsersGroupUpdate = await prisma.studentGroup.update({
        where: { id: ALL_USERS_GROUP_ID },
        data: {
            users: {
                connect: allUsersGroupMembers
            }
        }
    });
    const classGroupUpdate = await prisma.studentGroup.update({
        where: { id: CLASS_GROUP_ID },
        data: {
            users: {
                connect: [{ id: FOO_BAR_ID }, { id: TEST_USER_ID }]
            }
        }
    });
    const projectGroupUpdate = await prisma.studentGroup.update({
        where: { id: PROJECT_GROUP_ID },
        data: {
            users: {
                connect: [{ id: FOO_BAR_ID }]
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
