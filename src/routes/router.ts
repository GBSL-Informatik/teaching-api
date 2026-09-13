import express from 'express';
import { all as allUsers, find as findUser, update as updateUser, user } from '../controllers/users.js';
import {
    all as allStudentGroups,
    create as createStudentGroup,
    destroy as deleteStudentGroup,
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
    update as updateDocument,
    linkTo as linkDocument
} from '../controllers/documents.js';
import {
    create as createDocumentRoot,
    update as updateDocumentRoot,
    permissions as allPermissions,
    findMultipleFor as findMultipleDocumentRootsFor,
    destroy as deleteDocumentRoot,
    multipleDocuments
} from '../controllers/documentRoots.js';
import {
    allowedActions,
    createAllowedAction,
    destroyAllowedAction,
    exportData,
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
 * a post endpoint to prevent issues with long query strings when requesting
 * many document roots for a user
 */
router.post('/users/:id/documentRoots', findMultipleDocumentRootsFor);

router.get('/studentGroups', allStudentGroups);
router.post('/studentGroups', createStudentGroup);

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

router.post('/documentRoots/permissions', allPermissions);
router.post('/documentRoots/:id', createDocumentRoot);
router.put('/documentRoots/:id', updateDocumentRoot);
router.delete('/documentRoots/:id', deleteDocumentRoot);

router.post('/documents', createDocument);

/**
 * a post endpoint to prevent issues with long query strings when requesting
 * many document roots (for the current user, or when having elevated access, for any user)
 * Returns all documents which are linked to the **document roots**.
 */
router.post('/documents/multiple', multipleDocuments);
router.put('/documents/:id', updateDocument);
router.put('/documents/:id/linkTo/:parentId', linkDocument);
router.delete('/documents/:id', deleteDocument);

router.get('/admin/allowedActions', allowedActions);
router.post('/admin/allowedActions', createAllowedAction);
router.delete('/admin/allowedActions/:id', destroyAllowedAction);
router.post('/admin/users/:id/linkUserPassword', linkUserPassword);
router.post('/admin/users/:id/revokeUserPassword', revokeUserPassword);
router.post('/admin/export', exportData);

router.get('/cms/settings', findCmsSettings);
router.put('/cms/settings', updateCmsSettings);
router.get('/cms/github-token', githubToken);
router.post('/cms/logout', githubLogout);

export default router;
