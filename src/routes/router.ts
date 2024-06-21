import express, { RequestHandler } from 'express';
import { all as allUsers, user, find as findUser, update as updateUser } from '../controllers/users';
import {
    all as allGroups,
    find as findGroup,
    update as updateGroup,
    create as createGroup,
    destroy as deleteGroup
} from '../controllers/groups';
import {
    all as allDocuments,
    find as findDocument,
    update as updateDocument,
    create as createDocument,
    destroy as deleteDocument
} from '../controllers/documents';

// initialize router
const router = express.Router();

router.get('/user', user);

router.get('/users', allUsers);
router.get('/users/:id', findUser);
router.put('/users/:id', updateUser);

router.get('/groups', allGroups);
router.post('/groups', createGroup);
router.get('/groups/:id', findGroup);
router.put('/groups/:id', updateGroup);
router.delete('/groups/:id', deleteGroup);

router.get('/documents', allDocuments);
router.post('/documents', createDocument);
router.get('/documents/:id', findDocument);
router.put('/documents/:id', updateDocument);
router.delete('/documents/:id', deleteDocument);

export default router;
