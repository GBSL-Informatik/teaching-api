import {Prisma} from '@prisma/client';
import {
  NONE_EXAM_DOCUMENT_ID,
  RO_EXERCISE_IMPSUM_DOCUMENT_ROOT_ID, RO_VISIBILITY_WRAPPER_DOCUMENT_ROOT_ID,
  RW_EXERCISE_LOREM_DOCUMENT_ROOT_ID
} from "./document-roots";
import {TEST_USER_ID} from "./users";
import {Access} from "@prisma/client";
import {CLASS_GROUP_ID, PROJECT_GROUP_ID} from "./student-groups";

const rootUserPermissions: Prisma.RootUserPermissionCreateManyInput[] = [
  {
    documentRootId: RW_EXERCISE_LOREM_DOCUMENT_ROOT_ID,
    userId: TEST_USER_ID,
    access: Access.RO},
  {
    documentRootId: NONE_EXAM_DOCUMENT_ID,
    userId: TEST_USER_ID,
    access: Access.None
  },
];

const rootGroupPermissions: Prisma.RootGroupPermissionCreateManyInput[] = [
  {
    documentRootId: RO_EXERCISE_IMPSUM_DOCUMENT_ROOT_ID,
    studentGroupId: CLASS_GROUP_ID,
    access: Access.RO
  },
  {
    documentRootId: NONE_EXAM_DOCUMENT_ID,
    studentGroupId: CLASS_GROUP_ID,
    access: Access.RW
  },
  {
    documentRootId: RO_VISIBILITY_WRAPPER_DOCUMENT_ROOT_ID,
    studentGroupId: PROJECT_GROUP_ID,
    access: Access.None
  },
];

export {rootUserPermissions, rootGroupPermissions};
