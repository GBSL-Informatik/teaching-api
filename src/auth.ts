import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import prisma from './prisma';
import { Role } from '@prisma/client';
import { admin } from 'better-auth/plugins';
import { sso } from '@better-auth/sso';

// If your Prisma file is located elsewhere, you can change the path

export const auth = betterAuth({
    socialProviders: {
        github: {
            clientId: process.env.GITHUB_CLIENT_ID!,
            clientSecret: process.env.GITHUB_CLIENT_SECRET!
        }
    },
    database: prismaAdapter(prisma, {
        provider: 'postgresql',
        usePlural: true
    }),
    advanced: {
        database: {
            generateId: false
        }
    },
    user: {
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
    plugins: [admin(), sso()]
});
