import app, { configure, sessionMiddleware } from './app';
import http from 'http';
import Logger from './utils/logger';
import { Server } from 'socket.io';
import { ClientToServerEvents, IoEvent, ServerToClientEvents } from './routes/socketEventTypes';
import passport from 'passport';
import EventRouter from './routes/socketEvents';
import { NextFunction, Request, Response } from 'express';

const PORT = process.env.PORT || 3002;

const server = http.createServer(app);
const corsOrigin = process.env.FRONTEND_URL ? [process.env.FRONTEND_URL /** additonal? */] : true;

const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
    cors: {
        origin: corsOrigin,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE']
    },
    transports: ['websocket' /* , 'polling' */]
});

// convert a connect middleware to a Socket.IO middleware
io.use((socket, next) => {
    sessionMiddleware(socket.request as Request, {} as Response, next as NextFunction);
});
io.use((socket, next) => {
    passport.initialize()(socket.request as Request, {} as Response, next as NextFunction);
});
io.use((socket, next) => {
    passport.session()(socket.request as Request, {} as Response, next as NextFunction);
});

EventRouter(io);

// only allow authenticated users in socketio
io.use((socket, next) => {
    if ((socket.request as any).user) {
        next();
    } else {
        next(new Error('unauthorized'));
    }
});

/** TODO: Remove
 * this is only! to demonstrate that everything is working
 */
setInterval(() => {
    io.emit(IoEvent.PING, { time: Date.now() });
}, 1000);

// Make io accessible to our router
app.use((req: Request, res, next) => {
    req.io = io;
    next();
});

configure(app);

server.listen(PORT || 3002, () => {
    Logger.info(`application is running at: http://localhost:${PORT}`);
    Logger.info('Press Ctrl+C to quit.');
});
