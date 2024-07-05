import express from 'express';
import { all as allUsers, user, find as findUser, update as updateUser } from '../controllers/users';
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

// router.get('/groups', allGroups);
// router.post('/groups', createGroup);
// router.get('/groups/:id', findGroup);
// router.put('/groups/:id', updateGroup);
// router.delete('/groups/:id', deleteGroup);

router.get('/documentRoots/:id', findDocumentRoot);

router.get('/documents', allDocuments);
router.post('/documents', createDocument);
router.get('/documents/:id', findDocument);
router.put('/documents/:id', updateDocument);
router.delete('/documents/:id', deleteDocument);

export default router;
