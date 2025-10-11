import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import prisma from './prisma';
import { admin, oneTimeToken, oAuthProxy } from 'better-auth/plugins';
import { sso } from '@better-auth/sso';
import { CORS_ORIGIN_STRINGIFIED } from './utils/originConfig';
import { getNameFromEmail } from './helpers/email';
import type { MicrosoftEntraIDProfile } from 'better-auth/social-providers';
import Logger from './utils/logger';

// If your Prisma file is located elsewhere, you can change the path

const COOKIE_PREFIX = process.env.APP_NAME || 'tdev';

const getNameFromMsftProfile = (profile: MicrosoftEntraIDProfile) => {
    if (profile.name) {
        const parts = profile.name.split(', ')[0]?.split(' ') || [];
        if (parts.length > 1) {
            const firstName = parts.pop()!;
            const lastName = parts.join(' ');
            return { firstName, lastName };
        }
    }
    return getNameFromEmail(profile.email || profile.preferred_username);
};

export const auth = betterAuth({
    socialProviders: {
        github: { clientId: process.env.GITHUB_CLIENT_ID!, clientSecret: process.env.GITHUB_CLIENT_SECRET! },
        microsoft: {
            clientId: process.env.MSAL_CLIENT_ID as string,
            clientSecret: process.env.MSAL_CLIENT_SECRET as string,
            tenantId: process.env.MSAL_TENANT_ID || 'common', // Use 'common' for multi-tenant applications
            authority: 'https://login.microsoftonline.com', // Authentication authority URL
            prompt: 'select_account', // Forces account selection,
            responseMode: 'query',
            // redirectURI: `${process.env.BETTER_AUTH_URL}/api/auth/callback/microsoft`,
            mapProfileToUser: (profile) => {
                const email = (profile.email || profile.preferred_username)?.toLowerCase();
                const name = getNameFromMsftProfile(profile);
                return {
                    id: profile.oid,
                    email: email,
                    firstName: name.firstName || '',
                    lastName: name.lastName || ''
                    // You can extract and map other fields as needed
                };
            }
        }
    },
    trustedOrigins: CORS_ORIGIN_STRINGIFIED,
    database: prismaAdapter(prisma, { provider: 'postgresql', usePlural: false }),
    advanced: {
        cookiePrefix: COOKIE_PREFIX,
        crossSubDomainCookies: {
            enabled: true
        },
        database: { generateId: false, useNumberId: false }
    },
    user: {
        additionalFields: {
            firstName: { type: 'string', required: false, input: false },
            lastName: { type: 'string', required: false, input: false }
        }
    },
    plugins: [
        oneTimeToken(),
        admin({ defaultRole: 'student', adminRoles: ['teacher', 'admin'] }),
        sso()
        // oAuthProxy()
    ],
    logger: {
        level: 'info',
        log: (level, message, ...args) => {
            // Custom logging implementation
            Logger.info(
                `[${level}] ${message}: ${args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(', ')}`
            );
        }
    }
});
