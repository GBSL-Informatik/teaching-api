import express from 'express';
import {
    allowedActions,
    createAllowedAction,
    destroyAllowedAction,
    exportData,
    linkUserPassword,
    revokeUserPassword
} from '../controllers/admins.js';
import {
    find as findCmsSettings,
    logout as githubLogout,
    githubToken,
    update as updateCmsSettings
} from '../controllers/cmsSettings.js';
import {
    permissions as allPermissions,
    create as createDocumentRoot,
    destroy as deleteDocumentRoot,
    findMultipleFor as findMultipleDocumentRootsFor,
    multipleDocuments,
    update as updateDocumentRoot
} from '../controllers/documentRoots.js';
import {
    create as createDocument,
    destroy as deleteDocument,
    find as findDocument,
    linkTo as linkDocument,
    update as updateDocument
} from '../controllers/documents.js';
import {
    create as createStudentGroupPermission,
    destroy as deleteStudentGroupPermission,
    update as updateStudentGroupPermission
} from '../controllers/rootGroupPermissions.js';
import {
    create as createUserPermission,
    destroy as deleteUserPermission,
    update as updateUserPermission
} from '../controllers/rootUserPermissions.js';
import {
    addUser as addStudentGroupUser,
    all as allStudentGroups,
    create as createStudentGroup,
    destroy as deleteStudentGroup,
    removeUser as removeStudentGroupUser,
    setAdminRole as setStudentGroupAdminRole,
    update as updateStudentGroup
} from '../controllers/studentGroups.js';
import { all as allUsers, find as findUser, update as updateUser, user } from '../controllers/users.js';

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
router.get('/documents/:id', findDocument);
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
