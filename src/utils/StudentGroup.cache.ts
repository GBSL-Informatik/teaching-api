import asApiRecord, { ApiStudentGroup } from '../helpers/StudentGroup.asApiRecord.js';
import prisma from '../prisma.js';
import Logger from './logger.js';

const MS_IN_45_MINUTES = 1000 * 60 * 45;
class StudentGroupCache {
    private cache = new Map<string, Set<string>>();
    private lastCacheRecreation: number | null = null;

    setStreamableGroupUsers(group: ApiStudentGroup) {
        if (!group.canPresent) {
            this.cache.delete(group.id);
            return;
        }
        this.cache.set(group.id, new Set(group.userIds.concat(group.adminIds)));
    }

    async recreate() {
        if (this.lastCacheRecreation && Date.now() - this.lastCacheRecreation < MS_IN_45_MINUTES) {
            return Promise.resolve();
        }
        const all = await prisma.studentGroup.findMany({
            include: { users: true }
        });
        this.cache.clear();
        for (const group of all.map((record) => asApiRecord(record)!)) {
            this.setStreamableGroupUsers(group);
        }
        Logger.info(`☄️  Created cache with ${this.cache.size} groups`);
        this.lastCacheRecreation = Date.now();
    }

    delete(groupId: string) {
        this.cache.delete(groupId);
    }

    get(groupId: string) {
        return this.cache.get(groupId);
    }
}

export default StudentGroupCache;
