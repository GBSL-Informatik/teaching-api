import type { Prisma } from '@prisma/client';
import prisma from '../prisma';
import { getNameFromEmail } from './email';

export const getAuthInfo = (authInfo?: Express.AuthInfo) => {
    if (!authInfo) {
        throw 'No valid authorization provided';
    }
    const { name, preferred_username, oid } = (authInfo as any) || {};
    if (!(name || preferred_username) || !oid) {
        throw 'No valid authorization provided';
    }
    let firstName = '';
    let lastName = '';
    if (name) {
        const parts = name.split(', ')[0]?.split(' ') || [];
        if (parts.length > 1) {
            firstName = parts.pop()!;
            lastName = parts.join(' ');
        }
    }
    if (!firstName && !lastName) {
        const mailName = getNameFromEmail(preferred_username);
        firstName = mailName.firstName;
        lastName = mailName.lastName;
    }
    return {
        email: preferred_username?.toLowerCase(),
        firstName: firstName,
        lastName: lastName,
        oid: oid
    };
};

export const userProps = (authInfo?: Express.AuthInfo, includeId?: boolean): Prisma.UserCreateInput => {
    const { email, firstName, lastName, oid } = getAuthInfo(authInfo);
    return {
        id: includeId ? oid : undefined,
        email: email,
        firstName: firstName,
        lastName: lastName
    };
};

export const findUser = async (authInfo?: Express.AuthInfo) => {
    const { oid } = getAuthInfo(authInfo);
    return await prisma.user.upsert({
        where: { id: oid },
        update: userProps(authInfo, false),
        create: userProps(authInfo, true)
    });
};
