import * as Sentry from '@sentry/node';
import Logger from './utils/logger';
import dotenv from 'dotenv';
dotenv.config();
if (process.env.NODE_ENV === 'production' && process.env.SENTRY_DSN) {
    Logger.info('Initializing Sentry');
    let samplingRate = 0.1;
    if (process.env['SENTRY_TRACES_SAMPLE_RATE']) {
        try {
            samplingRate = Number(process.env['SENTRY_TRACES_SAMPLE_RATE']);
        } catch (e) {
            Logger.error('Error initializing Sentry', e);
        }
    }
    if (samplingRate < 0 || samplingRate > 1 || Number.isNaN(samplingRate)) {
        Logger.error('Invalid Sentry sampling rate', samplingRate);
        samplingRate = 0.1;
    }
    Sentry.init({
        dsn: process.env.SENTRY_DSN,
        tracesSampleRate: samplingRate
    });
    Sentry.addIntegration(Sentry.prismaIntegration());
}
