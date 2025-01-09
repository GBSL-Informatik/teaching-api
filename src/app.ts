import { strategyForEnvironment } from './auth/index';
import express, { NextFunction, Request, Response } from 'express';
import session from 'express-session';
import prisma from './prisma';
import path from 'path';
import cors from 'cors';
import morganMiddleware from './middleware/morgan.middleware';
import passport from 'passport';
import router from './routes/router';
import githubRouter from './routes/router.github';
import routeGuard, { PUBLIC_GET_ACCESS, PUBLIC_GET_ACCESS_REGEX, createAccessRules } from './auth/guard';
import authConfig from './routes/authConfig';
import { type User } from '@prisma/client';
import { HttpStatusCode } from './utils/errors/BaseError';
import { HTTP401Error } from './utils/errors/Errors';
import connectPgSimple from 'connect-pg-simple';
import Logger from './utils/logger';
import type { ClientToServerEvents, ServerToClientEvents } from './routes/socketEventTypes';
import type { Server } from 'socket.io';

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
        credentials: true,
        origin: process.env.WITH_DEPLOY_PREVIEW
            ? [process.env.FRONTEND_URL || true, /https:\/\/deploy-preview-\d+--teaching-dev.netlify.app/]
            : process.env.FRONTEND_URL || true /* true = strict origin */,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD']
    })
);

// received packages should be presented in the JSON format
app.use(express.json({ limit: '5mb' }));

app.use(morganMiddleware);

const store = new (connectPgSimple(session))({
    conString: process.env.DATABASE_URL,
    tableName: 'sessions'
});

const HOSTNAME = new URL(process.env.FRONTEND_URL || 'http://localhost:3000').hostname;
const domainParts = HOSTNAME.split('.');
const domain = domainParts.slice(domainParts.length - 2).join('.'); /** foo.bar.ch --> domain is bar.ch */

const SESSION_MAX_AGE = 2592000000 as const; // 1000 * 60 * 60 * 24 * 30 = 2592000000 = 30 days

/** make sure to have 1 (reverse) proxy in front of the application
 * as is the case with dokku (nginx)
 */
app.set('trust proxy', 1);

const SESSION_KEY = `${process.env.APP_NAME || 'twa'}ApiKey`;

/** https://medium.com/developer-rants/how-to-handle-sessions-properly-in-express-js-with-heroku-c35ea8c0e500 */
export const sessionMiddleware = session({
    name: SESSION_KEY /** twa stands for "TeachingWebsiteApi" */,
    store: store,
    secret: process.env.SESSION_SECRET || 'secret',
    saveUninitialized: false,
    resave: false,
    proxy: process.env.NODE_ENV === 'production',
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: process.env.WITH_DEPLOY_PREVIEW ? 'none' : 'strict',
        domain: domain.length > 0 ? domain : undefined,
        maxAge: SESSION_MAX_AGE // 30 days
    }
});

app.use(sessionMiddleware);

app.use(passport.initialize());

/** alias for passport.authenticate('session'); e.g. to use the session... */
app.use(passport.session());

passport.use(strategyForEnvironment());

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
    const user = await prisma.user.findUnique({ where: { id: id } });
    done(null, user);
});

// Serve the static files to be accessed by the docs app
app.use(express.static(path.join(__dirname, '..', 'docs')));

// Public Endpoints
app.get(`${API_URL}`, (req, res) => {
    return res.status(200).send('Welcome to the TEACHING-WEBSITE-API V1.0');
});

const SessionOauthStrategy = (req: Request, res: Response, next: NextFunction) => {
    if (req.isAuthenticated()) {
        return next();
    }
    passport.authenticate('oauth-bearer', { session: true })(req, res, next);
};

app.get(`${API_URL}/checklogin`, SessionOauthStrategy, async (req, res, next) => {
    try {
        if (req.user) {
            return res.status(200).send('OK');
        }
        throw new HTTP401Error();
    } catch (error) {
        next(error);
    }
});

app.post(`${API_URL}/logout`, async (req, res, next) => {
    req.logout({ keepSessionInfo: false }, (err) => {
        if (err) {
            Logger.error(err);
            return next(err);
        }
    });
    Logger.info(req.user);
    Logger.info(req.session);
    // await prisma.sessions.delete({ where: { sid: req.session.id } });
    res.clearCookie(SESSION_KEY).send();
});

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
            const io = req.io as Server<ClientToServerEvents, ServerToClientEvents>;

            if (res.notifications && io) {
                res.notifications.forEach((notification) => {
                    const except: string[] = [];
                    /** ignore this socket */
                    if (!notification.toSelf) {
                        const socketID = req.headers['x-metadata-socketid'] as string;
                        if (socketID) {
                            except.push(socketID);
                        }
                    }
                    io.except(except)
                        .to(notification.to)
                        .emit(notification.event, notification.message as any);
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
        `${API_URL}`,
        (req, res, next) => {
            if (req.isAuthenticated()) {
                return next();
            }
            passport.authenticate('oauth-bearer', { session: true }, (err: Error, user: User, info: any) => {
                if (err) {
                    /**
                     * An error occurred during authorization. Send a Not Autohrized
                     * status code.
                     */
                    return res.status(HttpStatusCode.UNAUTHORIZED).json({ error: err.message });
                }

                if (
                    !user &&
                    !(
                        PUBLIC_GET_ACCESS.has(req.path.toLowerCase()) ||
                        PUBLIC_GET_ACCESS_REGEX.some((regex) => regex.test(req.path))
                    )
                ) {
                    // If no user object found, send a 401 response.
                    return res.status(HttpStatusCode.UNAUTHORIZED).json({ error: 'Unauthorized' });
                }
                req.user = user;
                if (info) {
                    // access token payload will be available in req.authInfo downstream
                    req.authInfo = info;
                    return next();
                }
            })(req, res, next);
        },
        routeGuard(AccessRules), // route guard middleware
        router, // the router with all the routes
        githubRouter
    );
};

if (process.env.NODE_ENV === 'test') {
    configure(app);
}

export default app;
