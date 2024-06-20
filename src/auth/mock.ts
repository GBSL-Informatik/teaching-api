/* istanbul ignore file */
import { Request } from 'express';
import { ParamsDictionary } from 'express-serve-static-core';
import { Strategy, StrategyCreated, StrategyCreatedStatic } from 'passport';
import { ParsedQs } from 'qs';
import prisma from '../prisma';
import Logger from '../utils/logger';
class MockStrat extends Strategy {
    name = 'oauth-bearer';
    constructor() {
        super();
    }
    async authenticate(
        this: StrategyCreated<this, this & StrategyCreatedStatic>,
        req: Request<ParamsDictionary, any, any, ParsedQs, Record<string, any>>,
        options?: any
    ) {
        let where: { email: string } | { id: string } = { id: process.env.USER_ID || '-1' };
        if (process.env.NODE_ENV === 'test' && req.headers.authorization) {
            try {
                const auth = JSON.parse(req.headers.authorization) as { email: string };
                where = { email: auth.email || 'anonymous@user.ch' };
            } catch (/* istanbul ignore next */ err) {
                Logger.warn('Bearer Verify Error', err);
                return this.fail('Could not parse authorization header');
            }
        }
        if ('id' in where && where.id === '-1') {
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
