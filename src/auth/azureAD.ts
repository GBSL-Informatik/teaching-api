import prisma from '../prisma';
// import { BearerStrategy, IBearerStrategyOptionWithRequest, VerifyBearerFunction } from 'passport-azure-ad';
import { getAuthInfo, userProps } from '../helpers/authInfo';
import authConfig from '../routes/authConfig';
import Logger from '../utils/logger';
// Set the Azure AD B2C options
const auth = {
    tenantID: authConfig.credentials.tenantID,
    clientID: authConfig.credentials.clientID,
    audience: authConfig.credentials.clientID,
    authority: authConfig.metadata.authority,
    version: authConfig.metadata.version,
    discovery: authConfig.metadata.discovery,
    scope: ['access_as_user'],
    validateIssuer: authConfig.settings.validateIssuer,
    passReqToCallback: authConfig.settings.passReqToCallback,
    loggingLevel: authConfig.settings.loggingLevel
};

const options = {
    identityMetadata: `https://${auth.authority}/${auth.tenantID}/${auth.version}/${auth.discovery}`,
    issuer: `https://${auth.authority}/${auth.tenantID}/${auth.version}`,
    clientID: auth.clientID,
    audience: auth.audience,
    validateIssuer: auth.validateIssuer,
    passReqToCallback: auth.passReqToCallback,
    loggingLevel: auth.loggingLevel as 'info' | 'warn' | 'error' | undefined,
    loggingNoPII: true,
    scope: auth.scope
};

const BearerVerify = async (token: any, done: any) => {
    const { oid } = getAuthInfo(token);
    // @link https://medium.com/@prashantramnyc/node-js-with-passport-authentication-simplified-76ca65ee91e5
    const user = await prisma.user
        .upsert({
            where: { id: oid },
            update: userProps(token, false),
            create: userProps(token, true)
        })
        .catch((err) => {
            Logger.error('Bearer Verify Error', err);
            return false;
        });
    // Send user info using the second argument
    done(null, user, token);
};

// export const getStrategy = () => {
//     const strategy = new BearerStrategy(options, BearerVerify);
//     return strategy;
// };
