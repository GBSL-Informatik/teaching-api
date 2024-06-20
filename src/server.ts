import app, { configure, sessionMiddleware } from './app';
import http from 'http';
import Logger from './utils/logger';

const PORT = process.env.PORT || 3002;

const server = http.createServer(app);

configure(app);

server.listen(PORT || 3002, () => {
    Logger.info(`application is running at: http://localhost:${PORT}`);
    Logger.info('Press Ctrl+C to quit.');
});
