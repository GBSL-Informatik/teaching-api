import express, { RequestHandler } from 'express';
import { all as allUsers, user, find as findUser, update as updateUser } from '../controllers/users';
import { all as allGroups, find as findGroup, update as updateGroup, create as createGroup, destroy as deleteGroup } from '../controllers/groups';

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


export default router;
