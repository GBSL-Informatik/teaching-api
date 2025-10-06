import './instrumentation';
import app, { configure } from './app';
import http from 'http';
import { Server } from 'socket.io';
import { ClientToServerEvents, ServerToClientEvents } from './routes/socketEventTypes';
// import passport from 'passport';
import EventRouter from './routes/socketEvents';
import type { NextFunction, Request, Response } from 'express';
import { HTTP403Error } from './utils/errors/Errors';
import { CORS_ORIGIN } from './utils/originConfig';
import * as Sentry from '@sentry/node';
import Logger from './utils/logger';

const PORT = process.env.PORT || 3002;

const server = http.createServer(app);

const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
    cors: { origin: CORS_ORIGIN, credentials: true, methods: ['GET', 'POST', 'PUT', 'DELETE'] },
    pingInterval: 15_000,
    pingTimeout: 20_000,
    transports: ['websocket', 'webtransport' /* , 'polling' */]
});

EventRouter(io);

// Make io accessible to our router
app.use((req: Request, res, next) => {
    req.io = io;
    next();
});

configure(app);

if (process.env.NODE_ENV === 'production' && process.env.SENTRY_DSN) {
    Sentry.setupExpressErrorHandler(app);
}

server.listen(PORT || 3002, () => {
    Logger.info(`application is running at: http://localhost:${PORT}`);
    Logger.info('Press Ctrl+C to quit.');
});
