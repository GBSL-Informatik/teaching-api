import { Prisma } from '../generated/client.js';

const rootUserPermissions: Prisma.RootUserPermissionCreateManyInput[] = [];

const rootGroupPermissions: Prisma.RootGroupPermissionCreateManyInput[] = [];

export { rootUserPermissions, rootGroupPermissions };
