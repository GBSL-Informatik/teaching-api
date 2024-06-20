import { Prisma } from '@prisma/client';
import { FOO_BAR_ID, TEST_USER_ID } from './users';

const { USER_EMAIL, USER_ID } = process.env;

export const RO_DOCUMENT_ID = 'c5c51c3d-aa9c-4b97-a40a-4456fa0cb054';
export const RW_DOCUMENT_ID = '50ccec2b-5f68-45a5-8607-0cc199696a70';
export const ALL_DOCUMENT_ID = '5b492192-d89d-4e9d-8260-ebc10995e325';
export const TEST_DOCUMENT_ID = '831c8b7a-693f-4aeb-b574-1ceacf84a0c3';

const documents: Prisma.DocumentCreateManyInput[] = [
    {
        authorId: FOO_BAR_ID, // foo@bar.ch
        type: 'text',
        data: {
            text: 'This is a test document from foo@bar.ch'
        }
    },
    {
        authorId: TEST_USER_ID, // test@user.ch
        type: 'text',
        data: {
            text: 'This is a test document from test@user.ch'
        }
    },
    {
        id: ALL_DOCUMENT_ID,
        authorId: TEST_USER_ID, // test@user.ch
        type: 'text',
        data: {
            text: 'Shared Doc All Users'
        }
    },
    {
        id: TEST_DOCUMENT_ID,
        authorId: TEST_USER_ID, // test@user.ch
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
        id: RO_DOCUMENT_ID,
        authorId: FOO_BAR_ID,
        type: 'text',
        data: {
            text: `Shared Doc Read Only ${USER_EMAIL}, RW for test users`
        }
    });
    documents.push({
        id: RW_DOCUMENT_ID,
        authorId: USER_ID,
        type: 'text',
        data: {
            text: `Shared Read/Write for ${USER_EMAIL}, Read Only for test users`
        }
    });
}

export { documents };
