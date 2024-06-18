import { Prisma } from "@prisma/client"

const { USER_EMAIL, USER_ID } = process.env;

const documents: Prisma.DocumentCreateManyInput[] = [
    {
        authorId: '96651c13-3af6-4cc0-b242-ea38d438dc41', // foo@bar.ch
        type: 'text',
        data: {
            text: 'This is a test document from foo@bar.ch'
        }
    },
    {
        authorId: '4b6d8b5d-3b6c-4c8b-8d3c-6f2c3f6e2b4b', // test@user.ch
        type: 'text',
        data: {
            text: 'This is a test document from test@user.ch'
        }
    },
    {
        id: '5b492192-d89d-4e9d-8260-ebc10995e325',
        authorId: '4b6d8b5d-3b6c-4c8b-8d3c-6f2c3f6e2b4b', // test@user.ch
        type: 'text',
        data: {
            text: 'Shared Doc All Users'
        }
    },
    {
        id: '831c8b7a-693f-4aeb-b574-1ceacf84a0c3',
        authorId: '4b6d8b5d-3b6c-4c8b-8d3c-6f2c3f6e2b4b', // test@user.ch
        type: 'text',
        data: {
            text: 'Shared Doc Test Users Only'
        }
    }
];



if (USER_EMAIL && USER_ID) {
    documents.push({
        authorId: USER_ID,
        type: 'text',
        data: {
            text: `This is a test document from ${USER_EMAIL}`
        }
    });
    documents.push({
        id: 'c5c51c3d-aa9c-4b97-a40a-4456fa0cb054',
        authorId: USER_ID,
        type: 'text',
        data: {
            text: `Shared Doc Read Only ${USER_EMAIL}, RW for test users`
        }
    });
    documents.push({
        id: '50ccec2b-5f68-45a5-8607-0cc199696a70',
        authorId: USER_ID,
        type: 'text',
        data: {
            text: `Shared Read/Write for ${USER_EMAIL}, Read Only for test users`
        }
    });
}

export { documents };