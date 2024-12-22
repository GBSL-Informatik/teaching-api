import express from 'express';
import { all as allUsers, find as findUser, update as updateUser, user } from '../controllers/users';
import {
    all as allStudentGroups,
    create as createStudentGroup,
    destroy as deleteStudentGroup,
    find as findStudentGroup,
    update as updateStudentGroup,
    addUser as addStudentGroupUser,
    removeUser as removeStudentGroupUser
} from '../controllers/studentGroups';
import {
    create as createUserPermission,
    destroy as deleteUserPermission,
    update as updateUserPermission
} from '../controllers/rootUserPermissions';
import {
    create as createStudentGroupPermission,
    destroy as deleteStudentGroupPermission,
    update as updateStudentGroupPermission
} from '../controllers/rootGroupPermissions';
import {
    create as createDocument,
    destroy as deleteDocument,
    find as findDocument,
    update as updateDocument,
    linkTo as linkDocument
} from '../controllers/documents';
import {
    create as createDocumentRoot,
    find as findDocumentRoot,
    findMany as findManyDocumentRoots,
    update as updateDocumentRoot,
    permissions as allPermissions,
    findManyFor as findManyDocumentRootsFor,
    allDocuments,
    destroy as deleteDocumentRoot
} from '../controllers/documentRoots';
import { allowedActions, createAllowedAction, destroyAllowedAction } from '../controllers/admins';

// initialize router
const router = express.Router();

router.get('/user', user);

router.get('/users', allUsers);
router.get('/users/:id', findUser);
router.put('/users/:id', updateUser);
/**
 * @optional ?ignoreMissingRoots: boolean
 * @requires ?ids: string[]
 */
router.get('/users/:id/documentRoots', findManyDocumentRootsFor);

router.get('/studentGroups', allStudentGroups);
router.post('/studentGroups', createStudentGroup);
/**
 * TODO: do we need id-based access?
 */
router.get('/studentGroups/:id', findStudentGroup);

router.put('/studentGroups/:id', updateStudentGroup);
router.delete('/studentGroups/:id', deleteStudentGroup);
router.post('/studentGroups/:id/members/:userId', addStudentGroupUser);
router.delete('/studentGroups/:id/members/:userId', removeStudentGroupUser);

router.post('/permissions/user', createUserPermission);
router.put('/permissions/user/:id', updateUserPermission);
router.delete('/permissions/user/:id', deleteUserPermission);

router.post('/permissions/group', createStudentGroupPermission);
router.put('/permissions/group/:id', updateStudentGroupPermission);
router.delete('/permissions/group/:id', deleteStudentGroupPermission);

router.get('/documentRoots', findManyDocumentRoots);
router.get('/documentRoots/:id', findDocumentRoot);
router.post('/documentRoots/:id', createDocumentRoot);
router.put('/documentRoots/:id', updateDocumentRoot);
router.delete('/documentRoots/:id', deleteDocumentRoot);
router.get('/documentRoots/:id/permissions', allPermissions);
/**
 * TODO: Reactivate once the controller's permissions are updated.
 * router.get('/documents', allDocuments);
 */
router.post('/documents', createDocument);

/**
 * @adminOnly --> handle in controller
 * Returns all documents which are linked to the **document roots**.
 * @requires ?rids: string[] -> the document root ids
 */
router.get('/documents', allDocuments);
router.get('/documents/:id', findDocument);
router.put('/documents/:id', updateDocument);
router.put('/documents/:id/linkTo/:parentId', linkDocument);
router.delete('/documents/:id', deleteDocument);

router.get('/admin/allowedActions', allowedActions);
router.post('/admin/allowedActions', createAllowedAction);
router.delete('/admin/allowedActions/:id', destroyAllowedAction);

export default router;
