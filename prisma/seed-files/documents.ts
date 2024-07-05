import {Prisma} from '@prisma/client';
import {FOO_BAR_ID, TEST_USER_ID} from './users';
import {
  NONE_EXAM_DOCUMENT_ID,
  RW_EXERCISE_IMPSUM_DOCUMENT_ROOT_ID, RO_VISIBILITY_WRAPPER_DOCUMENT_ROOT_ID,
  RW_EXERCISE_LOREM_DOCUMENT_ROOT_ID

} from "./document-roots";

const {USER_EMAIL, USER_ID} = process.env;

export const FOO_BAR_EXERCISE_LOREM_DOCUMENT_ID = 'c5c51c3d-aa9c-4b97-a40a-4456fa0cb054';
export const TEST_USER_EXERCISE_LOREM_DOCUMENT_ID = '50ccec2b-5f68-45a5-8607-0cc199696a70';
export const FOO_BAR_EXERCISE_IMPSUM_DOCUMENT_ID = '5b492192-d89d-4e9d-8260-ebc10995e325';
export const TEST_USER_EXERCISE_IPSUM_DOCUMENT_ID = '831c8b7a-693f-4aeb-b574-1ceacf84a0c3';
export const FOO_BAR_EXAM_DOCUMENT_ID = '3fa55e05-6e82-4a86-922a-81b25325db69';
export const FOO_BAR_VISIBILITY_WRAPPER_DOCUMENT_ID = 'bb1d0183-1640-46ef-9fa2-d4a37ae7714d';
export const TEST_USER_VISIBILITY_WRAPPER_DOCUMENT_ID = 'b0b0baf9-e9ef-47c0-be59-5108915528d3';

const documents: Prisma.DocumentCreateManyInput[] = [
  {
    id: FOO_BAR_EXERCISE_LOREM_DOCUMENT_ID,
    authorId: FOO_BAR_ID, // foo@bar.ch
    documentRootId: RW_EXERCISE_LOREM_DOCUMENT_ROOT_ID,
    type: 'text',
    data: {
      text: 'This is the Lorem exercise from foo@bar.ch. They should be able to edit this document.'
    }
  },
  {
    id: TEST_USER_EXERCISE_LOREM_DOCUMENT_ID,
    authorId: TEST_USER_ID, // test@user.ch
    documentRootId: RW_EXERCISE_LOREM_DOCUMENT_ROOT_ID,
    type: 'text',
    data: {
      text: 'This is the Lorem exercise from test@user.ch. They should be able to edit this document because their user permission is set to RO.'
    }
  },
  {
    id: FOO_BAR_EXERCISE_IMPSUM_DOCUMENT_ID,
    authorId: FOO_BAR_ID, // foo@bar.ch
    documentRootId: RW_EXERCISE_IMPSUM_DOCUMENT_ROOT_ID,
    type: 'text',
    data: {
      text: 'This is the Ipsum exercise from foo@bar.ch. This document should be read-only for them, because their class has RO permission.'
    }
  },
  {
    id: TEST_USER_EXERCISE_IPSUM_DOCUMENT_ID,
    authorId: TEST_USER_ID, // test@user.ch
    documentRootId: RW_EXERCISE_IMPSUM_DOCUMENT_ROOT_ID,
    type: 'text',
    data: {
      text: 'This is the Ipsum exercise from test@user.ch. This document should be read-only for them, because their class has RO permission.'
    }
  },
  {
    id: FOO_BAR_EXAM_DOCUMENT_ID,
    authorId: FOO_BAR_ID, // foo@bar.ch
    documentRootId: NONE_EXAM_DOCUMENT_ID,
    type: 'text',
    data: {
      text: 'This is the exam from foo@bar.ch. They should be able to edit it, because their class has RW permission.'
    }
  },
  {
    id: FOO_BAR_VISIBILITY_WRAPPER_DOCUMENT_ID,
    authorId: FOO_BAR_ID, // foo@bar.ch
    documentRootId: RO_VISIBILITY_WRAPPER_DOCUMENT_ROOT_ID,
    type: 'text',
    data: {
      text: 'This is a visibility wrapper for foo@bar.ch. This document should be read-only for them, indicating that they can see the wrapped resource (but cannot change this document).'
    }
  },
  {
    id: TEST_USER_VISIBILITY_WRAPPER_DOCUMENT_ID,
    authorId: TEST_USER_ID, // test@user.ch
    documentRootId: RO_VISIBILITY_WRAPPER_DOCUMENT_ROOT_ID,
    type: 'text',
    data: {
      text: 'This is a visibility wrapper for test@user.ch. They should not see this document, because their project group has None permission, indicating that they cannot see the wrapped resource.'
    }
  },
];

if (USER_EMAIL && USER_ID) {
  documents.push({
    authorId: USER_ID,
    documentRootId: RW_EXERCISE_LOREM_DOCUMENT_ROOT_ID,
    type: 'text',
    data: {
      text: `This is the Lorem exercise from ${USER_EMAIL}`
    }
  });
  documents.push({
    authorId: USER_ID,
    documentRootId: RW_EXERCISE_IMPSUM_DOCUMENT_ROOT_ID,
    type: 'text',
    data: {
      text: `This is the Ipsum exercise from ${USER_EMAIL}`
    }
  });
  documents.push({
    authorId: USER_ID,
    documentRootId: NONE_EXAM_DOCUMENT_ID,
    type: 'text',
    data: {
      text: `This is the exam document from ${USER_EMAIL}`
    }
  });
  documents.push({
    authorId: USER_ID,
    documentRootId: RO_VISIBILITY_WRAPPER_DOCUMENT_ROOT_ID,
    type: 'text',
    data: {
      text: `This is the visibility wrapper document from ${USER_EMAIL}`
    }
  });
}

export {documents};
