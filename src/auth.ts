import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import prisma from './prisma';
import { Role } from '@prisma/client';
// If your Prisma file is located elsewhere, you can change the path

export const auth = betterAuth({
    database: prismaAdapter(prisma, {
        provider: 'postgresql',
        usePlural: true
    }),
    user: {
        modelName: 'users',
        additionalFields: {
            role: {
                type: 'string',
                required: false,
                defaultValue: Role.STUDENT,
                input: false // don't allow user to set role
            },
            firstName: {
                type: 'string',
                required: false,
                input: false
            },
            lastName: {
                type: 'string',
                required: false,
                input: false
            }
        }
    },
    session: {
        modelName: 'sessions'
    },
    account: {
        modelName: 'accounts'
    }
});
