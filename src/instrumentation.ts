import * as Sentry from '@sentry/node';
import Logger from './utils/logger';

if (process.env.NODE_ENV === 'production' && process.env.SENTRY_DSN) {
    Logger.info('Initializing Sentry');
    Sentry.init({
        dsn: process.env.SENTRY_DSN,
        tracesSampleRate: 0.1,
        integrations: [Sentry.prismaIntegration()]
    });
}
