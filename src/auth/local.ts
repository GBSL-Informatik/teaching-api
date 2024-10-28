/* istanbul ignore file */
import {Request} from 'express';
import {ParamsDictionary} from 'express-serve-static-core';
import {Strategy, StrategyCreated, StrategyCreatedStatic} from 'passport';
import {ParsedQs} from 'qs';
import prisma from '../prisma';
import Logger from '../utils/logger';
import bcrypt from 'bcrypt';
import {LocalUserCredential, User} from '@prisma/client';

// TODO: Consider moving to models?
type UserWithLocalCredential = User & { localUserCredential: LocalUserCredential };

interface AuthHeaders {
    email: string;
    password: string;
}

class LocalStrat extends Strategy {
    name = 'local';
    constructor() {
        super();
    }
    async authenticate(
        this: StrategyCreated<this, this & StrategyCreatedStatic>,
        req: Request<ParamsDictionary, any, any, ParsedQs, Record<string, any>>,
        options?: any
    ) {
        if (!req.headers.authorization) {
            return this.fail('Missing authorization header');
        }

        let auth: AuthHeaders;
        try {
            auth = JSON.parse(req.headers.authorization) as AuthHeaders;
        } catch (err) {
            Logger.warn('Bearer Verify Error', err);
            return this.fail('Could not parse authorization header');
        }

        try {
            const query = {
                where: {
                    email: auth.email
                },
                include: {
                    localUserCredential: true
                }
            };
            const user = (await prisma.user.findUnique(query)) as UserWithLocalCredential;
            if (!user) {
                return this.fail(`No User found for ${query}`);
            }

            const localCredential = user.localUserCredential;
            if (!localCredential) {
                return this.fail(`No local credential for user ${user}`);
            }

            if (localCredential.active && await bcrypt.compare(auth.password, localCredential.passwordHash)) {
                return this.success(user, { preferred_username: user.email });
            } else {
                return this.fail('Username or password invalid or credentials inactive');
            }
        } catch (err) {
            Logger.error('Bearer Verify Error', err);
            return this.fail(`Authentication with local user credentials failed with an error`);
        }
    }
}

export const getStrategy = () => {
    return new LocalStrat();
};
