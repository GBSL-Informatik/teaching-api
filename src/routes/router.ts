import express from 'express';
import { all as allUsers, user, find as findUser, update as updateUser } from '../controllers/users';
import {
  all as allStudentGroups,
  find as findStudentGroup,
  update as updateStudentGroup,
  create as createStudentGroup,
  destroy as deleteStudentGroup
} from '../controllers/student-groups';
import {
  all as allDocuments,
  find as findDocument,
  update as updateDocument,
  create as createDocument,
  destroy as deleteDocument
} from '../controllers/documents';
import {
  find as findDocumentRoot
} from '../controllers/document-roots';

// initialize router
const router = express.Router();

router.get('/user', user);

router.get('/users', allUsers);
router.get('/users/:id', findUser);
router.put('/users/:id', updateUser);

router.get('/studentGroups', allStudentGroups);
router.post('/studentGroups', createStudentGroup);
router.get('/studentGroups/:id', findStudentGroup);
router.put('/studentGroups/:id', updateStudentGroup);
router.delete('/studentGroups/:id', deleteStudentGroup);

// TODO: Do we need this endpoint? Is there a particular use case to exposing document roots?
router.get('/documentRoots/:id', findDocumentRoot);

router.get('/documents', allDocuments);
router.post('/documents', createDocument);
router.get('/documents/:id', findDocument);
router.put('/documents/:id', updateDocument);
router.delete('/documents/:id', deleteDocument);

export default router;
