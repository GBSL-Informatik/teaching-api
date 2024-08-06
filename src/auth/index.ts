import Logger from '../utils/logger';
import { getStrategy as mockStrategy } from './mock';
import { getStrategy } from './azureAD';
export const strategyForEnvironment = () => {
    if (process.env.NODE_ENV === 'test' || (process.env.USER_ID && process.env.NODE_ENV !== 'production')) {
        if (process.env.USER_ID) {
            const tid = process.env.USER_ID;
            const n = tid.length >= 46 ? 0 : 46 - tid.length;
            if (process.env.NODE_ENV !== 'test') {
                Logger.info(
                    [
                        '',
                        '┌──────────────────────────────────────────────────────────┐',
                        '│                                                          │',
                        '│   _   _                       _   _                      │',
                        '│  | \\ | |           /\\        | | | |                     │',
                        '│  |  \\| | ___      /  \\  _   _| |_| |__                   │',
                        "│  | . ` |/ _ \\    / /\\ \\| | | | __| '_ \\                  │",
                        '│  | |\\  | (_) |  / ____ \\ |_| | |_| | | |                 │',
                        '│  |_| \\_|\\___/  /_/    \\_\\__,_|\\__|_| |_|                 │',
                        '│                                                          │',
                        '│                                                          │',
                        `│   USER_ID: ${tid + ' '.repeat(n)}│`,
                        '│                                                          │',
                        '│                                                          │',
                        '│   --> enable authentication by removing "USER_ID"        │',
                        '│       from the environment (or the .env file)            │',
                        '│                                                          │',
                        '└──────────────────────────────────────────────────────────┘'
                    ].join('\n')
                );
            }
        }
        if (process.env.NODE_ENV !== 'test') {
            Logger.info(`NODE_ENV: ${process.env.NODE_ENV}`);
            Logger.info('USING MOCK STRATEGY');
        }
        return mockStrategy();
    }
    /* istanbul ignore next */
    return getStrategy();
};
