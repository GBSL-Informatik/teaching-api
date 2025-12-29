import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import prisma from './prisma.js';
import { admin, createAuthMiddleware, oneTimeToken } from 'better-auth/plugins';
import { CORS_ORIGIN_STRINGIFIED } from './utils/originConfig.js';
import { getNameFromEmail } from './helpers/email.js';
import type { GithubProfile, MicrosoftEntraIDProfile } from 'better-auth/social-providers';
import Logger from './utils/logger.js';
import { getIo, notify } from './socketIoServer.js';
import User from './models/User.js';
import { IoRoom } from './routes/socketEvents.js';
import { IoEvent, RecordType } from './routes/socketEventTypes.js';

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

const getNameFromGithubProfile = (profile: GithubProfile) => {
    if (profile.name) {
        const parts = profile.name.split(', ')[0]?.split(' ') || [];
        if (parts.length > 1) {
            const firstName = parts.pop()!;
            const lastName = parts.join(' ');
            return { firstName, lastName };
        }
    }
    const { firstName, lastName } = getNameFromEmail(profile.email);
    return { firstName: firstName ?? profile.login, lastName: lastName ?? profile.login };
};

const HAS_PROVIDER_GH = !!process.env.BETTER_AUTH_GITHUB_ID && !!process.env.BETTER_AUTH_GITHUB_SECRET;
const HAS_PROVIDER_MSFT = !!process.env.MSAL_CLIENT_ID && !!process.env.MSAL_CLIENT_SECRET;

export const auth = betterAuth({
    user: {
        additionalFields: {
            firstName: { type: 'string', required: true, input: true },
            lastName: { type: 'string', required: true, input: true }
        },
        deleteUser: {
            enabled: false
        }
    },
    account: {
        encryptOAuthTokens: false,
        accountLinking: {
            enabled: true,
            trustedProviders: ['github', 'microsoft', 'email-password'],
            allowDifferentEmails: true
        }
    },
    emailAndPassword: {
        enabled: true,
        disableSignUp: true,
        revokeSessionsOnPasswordReset: true
    },
    socialProviders: {
        ...(HAS_PROVIDER_GH
            ? {
                  github: {
                      clientId: process.env.BETTER_AUTH_GITHUB_ID!,
                      clientSecret: process.env.BETTER_AUTH_GITHUB_SECRET!,
                      mapProfileToUser: (profile) => {
                          const name = getNameFromGithubProfile(profile);
                          return {
                              ...profile,
                              firstName: name.firstName || '',
                              lastName: name.lastName || ''
                          };
                      }
                  }
              }
            : {}),
        ...(HAS_PROVIDER_MSFT
            ? {
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
              }
            : {})
    },
    trustedOrigins: CORS_ORIGIN_STRINGIFIED,
    database: prismaAdapter(prisma, { provider: 'postgresql', usePlural: false }),
    advanced: {
        cookiePrefix: COOKIE_PREFIX,
        crossSubDomainCookies: {
            enabled: true
        },
        cookies: process.env.NETLIFY_PROJECT_NAME
            ? {
                  session_token: {
                      attributes: {
                          sameSite: 'none',
                          secure: true
                      }
                  }
              }
            : undefined,
        database: { generateId: false, useNumberId: false }
    },
    hooks: {
        after: createAuthMiddleware(async (ctx) => {
            const userId = ctx.body?.userId as string | undefined;
            switch (ctx.path) {
                case '/admin/update-user':
                case '/admin/unban-user':
                case '/admin/set-user-password':
                    if (userId) {
                        const user = await User.findModel(userId);
                        if (user) {
                            notify({
                                to: [user.id, IoRoom.ADMIN],
                                event: IoEvent.CHANGED_RECORD,
                                message: {
                                    type: RecordType.User,
                                    record: user
                                }
                            });
                        }
                    }
                    break;
                case '/admin/ban-user':
                    if (userId) {
                        const user = await User.findModel(userId);
                        if (user) {
                            notify({
                                to: [IoRoom.ADMIN],
                                event: IoEvent.CHANGED_RECORD,
                                message: {
                                    type: RecordType.User,
                                    record: user
                                }
                            });
                            getIo().to(user.id).emit(IoEvent.ACTION, 'nav-reload');
                        }
                    }
                default:
                    return;
            }
        })
    },
    plugins: [oneTimeToken(), admin({ defaultRole: 'student', adminRoles: ['teacher', 'admin'] })],
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
