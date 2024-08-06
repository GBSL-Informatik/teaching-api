import { Access } from '@prisma/client';

export const highestAccess = (permissions: Set<Access>) => {
    if (permissions.has(Access.None)) {
        return Access.None;
    } else if (permissions.has(Access.RW)) {
        return Access.RW;
    } else if (permissions.has(Access.RO)) {
        return Access.RO;
    }
    return Access.None;
};
