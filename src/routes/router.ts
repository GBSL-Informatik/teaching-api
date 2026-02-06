import express from 'express';
import { all as allUsers, find as findUser, update as updateUser, user } from '../controllers/users.js';
import {
    all as allStudentGroups,
    create as createStudentGroup,
    destroy as deleteStudentGroup,
    find as findStudentGroup,
    update as updateStudentGroup,
    addUser as addStudentGroupUser,
    removeUser as removeStudentGroupUser,
    setAdminRole as setStudentGroupAdminRole
} from '../controllers/studentGroups.js';
import {
    create as createUserPermission,
    destroy as deleteUserPermission,
    update as updateUserPermission
} from '../controllers/rootUserPermissions.js';
import {
    create as createStudentGroupPermission,
    destroy as deleteStudentGroupPermission,
    update as updateStudentGroupPermission
} from '../controllers/rootGroupPermissions.js';
import {
    create as createDocument,
    destroy as deleteDocument,
    find as findDocument,
    update as updateDocument,
    linkTo as linkDocument
} from '../controllers/documents.js';
import {
    create as createDocumentRoot,
    find as findDocumentRoot,
    findMany as findManyDocumentRoots,
    update as updateDocumentRoot,
    permissions as allPermissions,
    findManyFor as findManyDocumentRootsFor,
    findMultipleFor as findMultipleDocumentRootsFor,
    allDocuments,
    destroy as deleteDocumentRoot,
    multipleDocuments
} from '../controllers/documentRoots.js';
import {
    allowedActions,
    createAllowedAction,
    destroyAllowedAction,
    linkUserPassword,
    revokeUserPassword
} from '../controllers/admins.js';
import {
    githubToken,
    find as findCmsSettings,
    update as updateCmsSettings,
    logout as githubLogout
} from '../controllers/cmsSettings.js';

// initialize router
const router = express.Router();

router.get('/user', user);

router.get('/users', allUsers);
router.get('/users/:id', findUser);
router.put('/users/:id', updateUser);
/**
 * @optional ?ignoreMissingRoots: boolean
 * @optional ?type: string -> filter included documents by provided type
 * @requires ?ids: string[]
 */
router.get('/users/:id/documentRoots', findManyDocumentRootsFor);
/**
 * a post endpoint to prevent issues with long query strings when requesting
 * many document roots for a user
 */
router.post('/users/:id/documentRoots', findMultipleDocumentRootsFor);

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
router.post('/studentGroups/:id/admins/:userId', setStudentGroupAdminRole);

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
router.post('/documents', createDocument);

/**
 * @adminOnly --> handle in controller
 * Returns all documents which are linked to the **document roots**.
 * @requires ?rids: string[] -> the document root ids
 */
router.get('/documents', allDocuments);
/**
 * a post endpoint to prevent issues with long query strings when requesting
 * many document roots for a user
 */
router.post('/documents/multiple', multipleDocuments);
router.get('/documents/:id', findDocument);
router.put('/documents/:id', updateDocument);
router.put('/documents/:id/linkTo/:parentId', linkDocument);
router.delete('/documents/:id', deleteDocument);

router.get('/admin/allowedActions', allowedActions);
router.post('/admin/allowedActions', createAllowedAction);
router.delete('/admin/allowedActions/:id', destroyAllowedAction);
router.post('/admin/users/:id/linkUserPassword', linkUserPassword);
router.post('/admin/users/:id/revokeUserPassword', revokeUserPassword);

router.get('/cms/settings', findCmsSettings);
router.put('/cms/settings', updateCmsSettings);
router.get('/cms/github-token', githubToken);
router.post('/cms/logout', githubLogout);
export default router;
