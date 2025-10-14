import { Prisma } from '@prisma/client';
import { FOO_BAR_ID, TEST_USER_ID } from './users';

const { USER_EMAIL, USER_ID } = process.env;

export const FOO_BAR_EXERCISE_LOREM_DOCUMENT_ID = 'c5c51c3d-aa9c-4b97-a40a-4456fa0cb054';
export const TEST_USER_EXERCISE_LOREM_DOCUMENT_ID = '50ccec2b-5f68-45a5-8607-0cc199696a70';
export const FOO_BAR_EXERCISE_IMPSUM_DOCUMENT_ID = '5b492192-d89d-4e9d-8260-ebc10995e325';
export const TEST_USER_EXERCISE_IPSUM_DOCUMENT_ID = '831c8b7a-693f-4aeb-b574-1ceacf84a0c3';
export const FOO_BAR_EXAM_DOCUMENT_ID = '3fa55e05-6e82-4a86-922a-81b25325db69';
export const FOO_BAR_VISIBILITY_WRAPPER_DOCUMENT_ID = 'bb1d0183-1640-46ef-9fa2-d4a37ae7714d';
export const TEST_USER_VISIBILITY_WRAPPER_DOCUMENT_ID = 'b0b0baf9-e9ef-47c0-be59-5108915528d3';

const documents: Prisma.DocumentCreateManyInput[] = [];

export { documents };
