import './instrumentation';
import app, { configure } from './app';
import { initialize as initializeSocketIo } from './socketIoServer';
import http from 'http';
import type { Request } from 'express';
import * as Sentry from '@sentry/node';
import Logger from './utils/logger';

const PORT = process.env.PORT || 3002;

const server = http.createServer(app);
initializeSocketIo(server);

configure(app);

if (process.env.NODE_ENV === 'production' && process.env.SENTRY_DSN) {
    Sentry.setupExpressErrorHandler(app);
}

server.listen(PORT || 3002, () => {
    Logger.info(`application is running at: http://localhost:${PORT}`);
    Logger.info('Press Ctrl+C to quit.');
});
