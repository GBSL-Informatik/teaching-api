import Logger from '../utils/logger';
import { getStrategy as mockStrategy } from './mock';
import { getStrategy } from './azureAD';
export const strategyForEnvironment = () => {
    if (process.env.NODE_ENV === 'test' || (process.env.NO_AUTH && process.env.NODE_ENV !== 'production')) {
        if (process.env.NO_AUTH) {
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
                        '│                                                          │',
                        '│                                                          │',
                        '│   --> enable authentication by removing "NO_AUTH"        │',
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
