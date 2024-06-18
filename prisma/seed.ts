import { PrismaClient, Role, User } from '@prisma/client';
import { users as seedUsers } from './seed-files/users';
import { documents as seedDocuments } from './seed-files/documents';
import { groups as seedGroups } from './seed-files/groups';
const prisma = new PrismaClient();

const { USER_ID } = process.env;


async function main() {
    if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'test') {
        return;
    }
    console.log(seedUsers)
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
                groupId: '8f60f838-940a-4ab3-bb65-405308b0db6c', /** All Users */
                documentId: '5b492192-d89d-4e9d-8260-ebc10995e325', /** Shared Doc All Users */
                readAccess: 'STUDENT',
                writeAccess: 'STUDENT'
            },
            {
                groupId: '106c9621-aed4-4592-a267-0670b5fe420c', /** Test Users */
                documentId: '831c8b7a-693f-4aeb-b574-1ceacf84a0c3',
                readAccess: 'STUDENT',
                writeAccess: 'STUDENT'
            }
        ]
    });
    await prisma.usersOnGroups.createMany({
        data: [
            ...['96651c13-3af6-4cc0-b242-ea38d438dc41', '4b6d8b5d-3b6c-4c8b-8d3c-6f2c3f6e2b4b', USER_ID].filter((id) => !!id)
                .map((id) => ({
                    userId: id!,
                    groupId: '8f60f838-940a-4ab3-bb65-405308b0db6c',
                    role: Role.ADMIN
                })),
            ...['96651c13-3af6-4cc0-b242-ea38d438dc41', '4b6d8b5d-3b6c-4c8b-8d3c-6f2c3f6e2b4b'].filter((id) => !!id)
                .map((id) => ({
                    userId: id!,
                    groupId: '106c9621-aed4-4592-a267-0670b5fe420c',
                    role: Role.ADMIN
                }))
        ]
    });

}


main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })