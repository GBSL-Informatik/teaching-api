import { Prisma } from '@prisma/client';

const rootUserPermissions: Prisma.RootUserPermissionCreateManyInput[] = [];

const rootGroupPermissions: Prisma.RootGroupPermissionCreateManyInput[] = [];

export { rootUserPermissions, rootGroupPermissions };
