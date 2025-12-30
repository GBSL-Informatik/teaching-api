import { adminAc, defaultAc } from 'better-auth/plugins/admin/access';

const revokedTeacherPermissions: (typeof adminAc.statements)['user'] = [
    'ban',
    'delete',
    'set-role',
    'impersonate'
];

export const teacher = defaultAc.newRole({
    ...adminAc.statements,
    user: adminAc.statements.user.filter((action) => !revokedTeacherPermissions.includes(action))
});
