import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import prisma from './prisma';
import { admin, oneTimeToken } from 'better-auth/plugins';
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
    user: {
        additionalFields: {
            firstName: { type: 'string', required: true, input: true },
            lastName: { type: 'string', required: true, input: true }
        }
    },
    emailAndPassword: {
        enabled: true
    },
    socialProviders: {
        github: {
            clientId: process.env.BETTER_AUTH_GITHUB_ID!,
            clientSecret: process.env.BETTER_AUTH_GITHUB_SECRET!,
            mapProfileToUser: (profile) => {
                const [firstName, lastName] = profile.name.split(' ');
                return {
                    ...profile,
                    firstName: firstName || '',
                    lastName: lastName || ''
                };
            }
        },
        microsoft: {
            clientId: process.env.MSAL_CLIENT_ID as string,
            clientSecret: process.env.MSAL_CLIENT_SECRET as string,
            tenantId: process.env.MSAL_TENANT_ID || 'common', // Use 'common' for multi-tenant applications
            authority: 'https://login.microsoftonline.com', // Authentication authority URL
            prompt: 'select_account', // Forces account selection,
            responseMode: 'query',
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
        cookies: {
            state: {
                attributes: {
                    sameSite: 'none',
                    secure: true
                }
            }
        },
        database: { generateId: false, useNumberId: false }
    },
    plugins: [oneTimeToken(), admin({ defaultRole: 'student', adminRoles: ['teacher', 'admin'] }), sso()],
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
