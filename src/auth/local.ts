/* istanbul ignore file */
import { Request } from 'express';
import { ParamsDictionary } from 'express-serve-static-core';
import { Strategy, StrategyCreated, StrategyCreatedStatic } from 'passport';
import { ParsedQs } from 'qs';
import prisma from '../prisma';
import Logger from '../utils/logger';
import bcrypt from 'bcrypt';
import { LocalUserCredential, Prisma, User } from '@prisma/client';

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
        let query: Prisma.UserFindUniqueArgs | undefined;
        try {
            auth = JSON.parse(req.headers.authorization) as AuthHeaders;
        } catch (err) {
            Logger.warn('Bearer Verify Error', err);
            return this.fail('Could not parse authorization header');
        }

        if (!query) {
            return this.fail('No User provided in request');
        }

        try {
            query = {
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

            const passwordHash = user.localUserCredential?.passwordHash;

            if (!passwordHash) {
                return this.fail(`No local credential for user ${user}`);
            }

            if (await bcrypt.compare(auth.password, passwordHash)) {
                return this.success(user, { preferred_username: user.email });
            } else {
                return this.fail('Invalid username or password');
            }
        } catch (err) {
            Logger.error('Bearer Verify Error', err);
            return this.fail(`No User found for ${query}`);
        }
    }
}

export const getStrategy = () => {
    return new LocalStrat();
};
