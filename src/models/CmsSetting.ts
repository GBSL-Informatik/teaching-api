import { Prisma, PrismaClient, CmsSettings as DbCmsSettings, User } from '../../prisma/generated/client';
import prisma from '../prisma';
import { createDataExtractor } from '../helpers/dataExtractor';
import Logger from '../utils/logger';
const getData = createDataExtractor<Prisma.CmsSettingsUncheckedUpdateInput>(['activeBranch', 'activePath']);

export type ApiCmsSettings = Omit<DbCmsSettings, 'refresh_token' | 'refresh_token_expires_at'> & {
    token?: string;
};

const prepareRecord = (record: DbCmsSettings): ApiCmsSettings => {
    const result = { ...record } as ApiCmsSettings;
    delete (result as any).refreshToken;
    delete (result as any).refreshTokenExpiresAt;
    return result;
};

interface GhResponse {
    access_token: string;
    expires_in?: number;
    refresh_token: string;
    refresh_token_expires_in?: number;
    scope: string;
    token_type: string;
}

function CmsSetting(db: PrismaClient['cmsSettings']) {
    return Object.assign(db, {
        async _invalidateTokens(userId: string): Promise<DbCmsSettings> {
            return db.update({
                where: { userId: userId },
                data: {
                    token: null,
                    tokenExpiresAt: null,
                    refreshToken: null,
                    refreshTokenExpiresAt: null
                }
            });
        },
        async _updateTokens(userId: string, githubToken: GhResponse): Promise<DbCmsSettings> {
            return db.upsert({
                where: { userId: userId },
                update: {
                    token: githubToken.access_token,
                    tokenExpiresAt: new Date(Date.now() + (githubToken.expires_in || 28800) * 1000),
                    refreshToken: githubToken.refresh_token,
                    refreshTokenExpiresAt: new Date(
                        Date.now() + (githubToken.refresh_token_expires_in || 15897600) * 1000
                    )
                },
                create: {
                    userId: userId,
                    token: githubToken.access_token,
                    tokenExpiresAt: new Date(Date.now() + (githubToken.expires_in || 28800) * 1000),
                    refreshToken: githubToken.refresh_token,
                    refreshTokenExpiresAt: new Date(
                        Date.now() + (githubToken.refresh_token_expires_in || 15897600) * 1000
                    )
                }
            });
        },
        async fetchToken(userId: string, code: string): Promise<ApiCmsSettings> {
            const response = await fetch('https://github.com/login/oauth/access_token', {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    client_id: process.env.GITHUB_CLIENT_ID,
                    client_secret: process.env.GITHUB_CLIENT_SECRET,
                    // Additional parameters as needed
                    redirect_uri: process.env.GITHUB_REDIRECT_URI,
                    scope: 'repo', // Requested permissions
                    code: code
                })
            });
            const githubToken = await response.json();
            if (githubToken.error) {
                Logger.error(githubToken.error_description);
                const model = await this._invalidateTokens(userId);
                return prepareRecord(model);
            }
            const model = await this._updateTokens(userId, githubToken);
            return prepareRecord(model);
        },
        async _refreshGithubToken(cms: DbCmsSettings): Promise<DbCmsSettings> {
            if (
                cms.token &&
                cms.tokenExpiresAt &&
                new Date(Date.now() + 60 * 60 * 4000) < cms.tokenExpiresAt // does not expire within the next 4 hours
            ) {
                return Promise.resolve(cms);
            }
            if (!cms.refreshToken || (cms.refreshTokenExpiresAt && cms.refreshTokenExpiresAt < new Date())) {
                return this._invalidateTokens(cms.userId);
            }
            Logger.info(
                `Refreshing Github token: ${cms.tokenExpiresAt?.toISOString()}: ${cms.tokenExpiresAt && cms.tokenExpiresAt < new Date(Date.now() + 60 * 60 * 4000)}`
            );
            const response = await fetch('https://github.com/login/oauth/access_token', {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    client_id: process.env.GITHUB_CLIENT_ID,
                    client_secret: process.env.GITHUB_CLIENT_SECRET,
                    // Additional parameters as needed
                    grant_type: 'refresh_token',
                    refresh_token: cms.refreshToken
                })
            });
            const githubToken = await response.json();
            if (githubToken.error) {
                Logger.error(githubToken.error_description);
                return this._invalidateTokens(cms.userId);
            }
            return this._updateTokens(cms.userId, githubToken);
        },
        async logout(actor: User): Promise<ApiCmsSettings | null> {
            const settings = await db.findUnique({ where: { userId: actor.id } });
            if (!settings) {
                return null;
            }
            const model = await this._invalidateTokens(actor.id);
            return prepareRecord(model);
        },
        async findModel(actor: User): Promise<ApiCmsSettings | null> {
            const settings = await db.upsert({
                where: { userId: actor.id },
                update: {},
                create: { userId: actor.id }
            });
            const refreshed = await this._refreshGithubToken(settings);
            return prepareRecord(refreshed);
        },
        async updateModel(actor: User, data: Partial<DbCmsSettings>): Promise<DbCmsSettings> {
            const sanitized = getData(data);
            const settings = await db.upsert({
                where: { userId: actor.id! },
                update: getData(data),
                create: {
                    user: { connect: { id: actor.id! } },
                    activeBranch: sanitized.activeBranch as string | null,
                    activePath: sanitized.activePath as string | null
                }
            });
            const refreshed = await this._refreshGithubToken(settings);
            return prepareRecord(refreshed);
        }
    });
}

export default CmsSetting(prisma.cmsSettings);
