import { NextFunction, Request, Response } from 'express';
import { AccessMatrix } from '../routes/authConfig.js';
import Logger from '../utils/logger.js';
import { HttpStatusCode } from '../utils/errors/BaseError.js';
import { getAccessLevel, Role } from '../models/User.js';

interface AccessRegexRule {
    path: string;
    regex: RegExp;
    weight: number;
    access: { methods: ('GET' | 'POST' | 'PUT' | 'DELETE')[]; minRole: Role }[];
}

const regexFromRoute = (route: string) => {
    const parts = route.toLowerCase().split('/');
    const regex = parts
        .map((part) => {
            if (part.startsWith(':')) {
                return '[^\\/]+';
            }
            return part;
        })
        .join('\\/');
    return new RegExp(`^${regex}$`, 'i');
};

export const createAccessRules = (accessMatrix: AccessMatrix): AccessRegexRule[] => {
    const accessRules = Object.values(accessMatrix);
    const maxParts = accessRules.reduce((max, accessRule) => {
        return Math.max(max, accessRule.path.split('/').length);
    }, 0);
    const accessRulesWithRegex = accessRules.map((accessRule) => {
        const parts = accessRule.path.split('/');
        let weight = 0;
        const path = parts
            .map((part, idx) => {
                if (part.startsWith(':')) {
                    weight += 2 ** ((maxParts - idx) * 2 - 1);
                    return '[^\\/]+';
                } else {
                    weight += 2 ** ((maxParts - idx) * 2);
                }
                return part;
            })
            .join('\\/');

        const regex = new RegExp(`^${path}`, 'i');
        return { ...accessRule, path: accessRule.path.toLowerCase(), regex: regex, weight: weight };
    });
    const rules = accessRulesWithRegex.sort((a, b) => b.weight - a.weight);
    Object.freeze(rules);
    /* istanbul ignore if */
    if (process.env.NODE_ENV !== 'test') {
        Logger.info('Access Rules created');
    }
    return rules;
};

const routeGuard = (accessMatrix: AccessRegexRule[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const reqPath = req.path.toLowerCase();
        /* istanbul ignore if */
        if (!(req as any).user) {
            return res.status(HttpStatusCode.FORBIDDEN).json({ error: 'No roles claim found!' });
        }

        if (!requestHasRequiredAttributes(accessMatrix, req.path, req.method, (req as any).user?.role)) {
            return res
                .status(HttpStatusCode.FORBIDDEN)
                .json({ error: 'User does not have the role, method or path' });
        }

        next();
    };
};

/**
 * This method checks if the request has the correct roles, paths and methods
 */
const requestHasRequiredAttributes = (
    accessMatrix: AccessRegexRule[],
    path: string,
    method: string,
    role?: Role
) => {
    const accessRules = Object.values(accessMatrix);
    const accessRule = accessRules
        .filter((accessRule) => accessRule.regex.test(path))
        .sort((a, b) => b.path.length - a.path.length)[0];
    /* istanbul ignore if */
    if (!accessRule) {
        return false;
    }
    const userAccessLevel = getAccessLevel(role);
    const hasAccess = accessRule.access.some(
        (rule) =>
            userAccessLevel >= getAccessLevel(rule.minRole) &&
            rule.methods.includes(method as 'GET' | 'POST' | 'PUT' | 'DELETE')
    );
    Logger.info(
        `${hasAccess ? '✅' : '❌'} Access Rule for ${role}: [${method}:${path}] ${JSON.stringify(accessRule)}`
    );
    return hasAccess;
};

export default routeGuard;
