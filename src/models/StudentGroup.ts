import {Prisma, PrismaClient, StudentGroup as DbStudentGroup, User} from '@prisma/client';
import prisma from '../prisma';
import {HTTP403Error, HTTP404Error} from '../utils/errors/Errors';
import {createDataExtractor} from '../helpers/dataExtractor';

const getData = createDataExtractor<Prisma.StudentGroupUncheckedUpdateInput>(['description', 'name']);

function StudentGroup(db: PrismaClient['studentGroup']) {
    return Object.assign(db, {

        async findModel(id: string): Promise<DbStudentGroup | null> {
            return db.findUnique({
                where: {
                    id: id
                },
                include: {
                    users: {
                        select: {
                            id: true,
                        }
                    }
                }
            });
        },

        async updateModel(actor: User, id: string, data: Partial<DbStudentGroup>): Promise<DbStudentGroup> {
            const record = await this.findModel(id);
            if (!record) {
                throw new HTTP404Error('Group not found');
            }
            if (!(record.id === actor.id || actor.isAdmin)) {
                throw new HTTP403Error('Not authorized');
            }
            /** remove fields not updatable*/
            const sanitized = getData(data);
            return db.update({
                where: {
                    id: id
                },
                data: sanitized
            });
        },

        async all(actor: User): Promise<DbStudentGroup[]> {
            // TODO: Does this behaviour make sense?
            //  Yes, it might be useful (a) for an admin to get all groups, and (b) for a user or admin to get all
            //  groups containing a specific user. However, this method now combines two separate behaviors and can't
            //  be used to get the groups that an admin is part of (which may not be required, but the behavior is still
            //  somewhat unexpected). Also, do we want to return the user IDs or not?
            if (actor.isAdmin) {
                return db.findMany({});
            }
            return db.findMany({
                where: {
                    users: {
                        some: {
                            id: actor.id
                        }
                    }
                },
                include: {
                    users: {
                        select: {
                            id: true
                        }
                    }
                }
            });
        },

        async createModel(name: string, description: string, parentId: string | null): Promise<DbStudentGroup> {
            // TODO: Guard against nonexistent parent if parentId is specified?
            return db.create({
                data: {
                    name: name,
                    description: description,
                    parentId: parentId,
                }
            });
        },

        async deleteModel(actor: User, id: string): Promise<DbStudentGroup> {
            return db.delete({
                where: {
                    id: id
                }
            });
        }
    });
}

export default StudentGroup(prisma.studentGroup);
