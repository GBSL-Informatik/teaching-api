import { Prisma } from '../generated/client';

const rootUserPermissions: Prisma.RootUserPermissionCreateManyInput[] = [];

const rootGroupPermissions: Prisma.RootGroupPermissionCreateManyInput[] = [];

export { rootUserPermissions, rootGroupPermissions };
