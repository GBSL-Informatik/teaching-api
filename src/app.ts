import express, { NextFunction, Request, Response } from 'express';
import path from 'path';
import cors from 'cors';
import morganMiddleware from './middleware/morgan.middleware';
import router from './routes/router';
import routeGuard, { createAccessRules } from './auth/guard';
import authConfig from './routes/authConfig';
import { type User } from '@prisma/client';
import BaseError from './utils/errors/BaseError';
import { fromNodeHeaders, toNodeHandler } from 'better-auth/node';
import { auth } from './auth';

import Logger from './utils/logger';
import { CORS_ORIGIN } from './utils/originConfig';
import { notify } from './socketIoServer';

const AccessRules = createAccessRules(authConfig.accessMatrix);

/**
 * Architecture samples
 * @link https://github.com/Azure-Samples/ms-identity-javascript-react-tutorial/blob/main/5-AccessControl/1-call-api-roles/API/app.js
 *
 */

const app = express();
export const API_VERSION = 'v1';
export const API_URL = `/api/${API_VERSION}`;

/**
 *  this is not needed when running behind a reverse proxy
 *  as is the case with dokku (nginx)
 */
//  app.use(compression(), express.json({ limit: "5mb" }));

// ensure the server can call other domains: enable cross origin resource sharing (cors)
app.use(
    cors({
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'],
        origin: CORS_ORIGIN,
        credentials: true
    })
);

/** make sure to have 1 (reverse) proxy in front of the application
 * as is the case with dokku (nginx)
 */
app.set('trust proxy', 1);
app.use(morganMiddleware);

// make sure to configure *before* the json middleware
app.all('/api/auth/{*any}', toNodeHandler(auth));

// received packages should be presented in the JSON format
app.use(express.json({ limit: '5mb' }));

// passport.deserializeUser(deserializeUser);

// Serve the static files to be accessed by the docs app
app.use(express.static(path.join(__dirname, '..', 'docs')));

const welcomeApi = (req: Request, res: Response) => {
    return res.status(200).send('Welcome to the TEACHING-WEBSITE-API V1.0');
};

// Public Endpoints
app.get(`${API_URL}`, welcomeApi);

const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
    if ((err as BaseError).isHttpError) {
        const httpErr = err as BaseError;
        res.status(httpErr.statusCode).send({
            errors: [
                {
                    name: httpErr.name,
                    message: httpErr.message,
                    status: httpErr.statusCode,
                    isOperational: httpErr.isOperational
                }
            ]
        });
    } else {
        res.status(500).send({ errors: [{ name: err.name, message: err.message }] });
    }
    Logger.error(err);
};

export const configure = (_app: typeof app) => {
    /**
     * Notification Middleware
     * when the response `res` contains a `notifications` property, the middleware will
     * send the notification over SocketIO to the specififed rooms.
     */
    _app.use((req: Request, res, next) => {
        res.on('finish', async () => {
            if (res.statusCode >= 400) {
                return;
            }
            if (res.notifications) {
                res.notifications.forEach((notification) => {
                    notify(notification, req.headers['x-metadata-sid'] as string);
                });
            }
        });
        next();
    });
    /**
     * API Route Guard
     * This middleware will check if the user is authenticated and has the required
     * permissions to access the requested route.
     */
    _app.use(
        API_URL,
        (req, res, next) => {
            return auth.api
                .getSession({ headers: fromNodeHeaders(req.headers) })
                .then((session) => {
                    if (!session?.user) {
                        return res.status(401).json({ error: 'Unauthorized' });
                    }
                    req.user = session.user as User;
                    return next();
                })
                .catch((err) => {
                    return res.status(401).json({ error: err.message });
                });
        },
        routeGuard(AccessRules), // route guard middleware
        router // the router with all the routes
    );
    _app.use(errorHandler);
};

if (process.env.NODE_ENV === 'test') {
    configure(app);
}

export default app;
