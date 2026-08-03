import { StudentGroup } from '../../prisma/generated/client.js';

export type ApiStudentGroup = StudentGroup & { userIds: string[]; adminIds: string[] };

function asApiRecord(
    record: StudentGroup & { users: { userId: string; isAdmin: boolean }[] }
): ApiStudentGroup;
function asApiRecord(record: null): null;
function asApiRecord(
    record: (StudentGroup & { users: { userId: string; isAdmin: boolean }[] }) | null
): ApiStudentGroup | null;
function asApiRecord(
    record: (StudentGroup & { users: { userId: string; isAdmin: boolean }[] }) | null
): ApiStudentGroup | null {
    if (!record) {
        return null;
    }
    const group = {
        ...record,
        userIds: record.users.map((user) => user.userId),
        adminIds: record.users.filter((u) => u.isAdmin).map((u) => u.userId)
    };
    delete (group as any).users;
    return group;
}

export default asApiRecord;
