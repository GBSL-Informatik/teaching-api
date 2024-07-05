import {Access, Prisma} from "@prisma/client";

export const RW_EXERCISE_LOREM_DOCUMENT_ROOT_ID = 'aa5b991b-ea21-450f-870d-55f2b9f1fac8';
export const RW_EXERCISE_IMPSUM_DOCUMENT_ROOT_ID = 'ff8aa31c-65df-4651-af6a-06751ccec77f';
export const NONE_EXAM_DOCUMENT_ID = 'd50cdcba-adfc-41fa-a1d1-7a026f86b12b';
export const RO_VISIBILITY_WRAPPER_DOCUMENT_ROOT_ID = '2b7c4da1-b909-4990-a13a-51b0ab2c1517';

const documentRoots: Prisma.DocumentRootCreateInput[] = [
  {
    id: RW_EXERCISE_LOREM_DOCUMENT_ROOT_ID,
    access: Access.RW,
  },
  {
    id: RW_EXERCISE_IMPSUM_DOCUMENT_ROOT_ID,
    access: Access.RW,
  },
  {
    id: NONE_EXAM_DOCUMENT_ID,
    access: Access.None,
  },
  {
    id: RO_VISIBILITY_WRAPPER_DOCUMENT_ROOT_ID,
    access: Access.RO,
  },
];

export { documentRoots };
