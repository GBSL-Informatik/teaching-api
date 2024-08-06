import { Access } from '@prisma/client';

export const highestUserAccess = (permissions: Set<Access>) => {
    if (permissions.has(Access.None)) {
        return Access.None;
    } else if (permissions.has(Access.RW)) {
        return Access.RW;
    } else if (permissions.has(Access.RO)) {
        return Access.RO;
    }
    return Access.None;
};


export const highestAccess = (permissions: Set<Access>, maxAccess?: Access) => {
    const userAccess = highestUserAccess(permissions);
    if (!maxAccess) {
        return userAccess;
    }

    switch (userAccess) {
        case Access.RW:
            return maxAccess;
        case Access.RO:
            if (maxAccess === Access.RW) {
                return Access.RO;
            }
            return maxAccess;
        case Access.None:
            return Access.None;
    }
};
