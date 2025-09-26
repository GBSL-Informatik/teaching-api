/* istanbul ignore file */
import { Request } from 'express';
import { ParamsDictionary } from 'express-serve-static-core';
// import { Strategy, StrategyCreated, StrategyCreatedStatic } from 'passport';
import { ParsedQs } from 'qs';
import prisma from '../prisma';
import Logger from '../utils/logger';
class MockStrat {
    name = 'oauth-bearer';
    constructor() {
        // super();
    }
    async authenticate(
        this: any,
        req: Request<ParamsDictionary, any, any, ParsedQs, Record<string, any>>,
        options?: any
    ) {
        if (process.env.NODE_ENV === 'production') {
            return this.fail('Mock Strategy not available in production');
        }

        let where: { email: string } | { id: string } | undefined = undefined;
        if (process.env.NODE_ENV === 'test' && req.headers.authorization) {
            try {
                const auth = JSON.parse(req.headers.authorization) as { email: string };
                where = { email: auth.email || 'anonymous@user.ch' };
            } catch (/* istanbul ignore next */ err) {
                Logger.warn('Bearer Verify Error', err);
                return this.fail('Could not parse authorization header');
            }
        } else if (req.headers.authorization) {
            try {
                const auth = JSON.parse(req.headers.authorization) as { email: string } | { id: string };
                if ('id' in auth) {
                    where = { id: auth.id };
                } else if ('email' in auth) {
                    where = { email: auth.email.toLowerCase() };
                }
            } catch (/* istanbul ignore next */ err) {
                Logger.warn('Bearer Verify Error', err);
                return this.fail('Could not parse authorization header');
            }
        }
        if (!where) {
            return this.fail('No User provided in request');
        }
        try {
            const user = await prisma.user.findUnique({
                where: where
            });
            if (!user) {
                return this.fail(`No User found for ${where}`);
            }
            return this.success(user, { preferred_username: user.email });
        } catch (/* istanbul ignore next */ err) {
            Logger.error('Bearer Verify Error', err);
            return this.fail(`No User found for ${where}`);
        }
    }
}

export const getStrategy = () => {
    const strategy = new MockStrat();
    return strategy;
};
