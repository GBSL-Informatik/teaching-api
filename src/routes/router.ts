import express, { RequestHandler } from 'express';
import { all as allUsers, user, find as findUser } from '../controllers/users';

// initialize router
const router = express.Router();

router.get('/user', user);

router.get('/users', allUsers);
router.get('/users/:id', findUser);

export default router;
