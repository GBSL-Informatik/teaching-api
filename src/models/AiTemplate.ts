import { Prisma, PrismaClient, User as DbUser, AiTemplate as DbAiTemplate } from '@prisma/client';
import prisma from '../prisma';
import { HTTP403Error } from '../utils/errors/Errors';
import _ from 'lodash';
import { hasElevatedAccess } from './User';

export function prepareAiTemplate(aiTemplate: DbAiTemplate): DbAiTemplate;
export function prepareAiTemplate(aiTemplate: null): null;
export function prepareAiTemplate(aiTemplate: DbAiTemplate | null): DbAiTemplate | null {
    if (!aiTemplate) {
        return null;
    }
    return {
        ...aiTemplate,
        apiKey: aiTemplate.apiKey
            ? `${aiTemplate.apiKey.slice(0, 4)}******${aiTemplate.apiKey.slice(-4)}`
            : ''
    };
}
function AiTemplate(db: PrismaClient['aiTemplate']) {
    return Object.assign(db, {
        async findModel(actor: DbUser, id: string): Promise<DbAiTemplate> {
            if (!hasElevatedAccess(actor.role)) {
                throw new HTTP403Error('Not authorized to find AI templates');
            }
            return db.findUniqueOrThrow({ where: { id } }).then((v) => prepareAiTemplate(v));
        },
        async updateModel(actor: DbUser, id: string, data: Partial<DbAiTemplate>): Promise<DbAiTemplate> {
            if (!hasElevatedAccess(actor.role)) {
                throw new HTTP403Error('Not authorized to update AI templates');
            }
            const record = await this.findModel(actor, id);
            /** remove fields not updatable*/
            return db
                .update({
                    where: {
                        id: record.id
                    },
                    data: {
                        ...data,
                        jsonSchema:
                            typeof data.jsonSchema === 'object'
                                ? (data.jsonSchema as Prisma.JsonObject)
                                : undefined
                    }
                })
                .then((v) => prepareAiTemplate(v));
        },
        async all(actor: DbUser): Promise<DbAiTemplate[]> {
            if (!hasElevatedAccess(actor.role)) {
                throw new HTTP403Error('Not authorized to get AI templates');
            }
            const templates = await db.findMany({});
            return templates.map((template) => prepareAiTemplate(template));
        },
        async createModel(actor: DbUser, data: Prisma.AiTemplateCreateInput): Promise<DbAiTemplate> {
            if (!hasElevatedAccess(actor.role)) {
                throw new HTTP403Error('Not authorized to create AI templates');
            }
            return db
                .create({
                    data: data
                })
                .then((v) => prepareAiTemplate(v));
        },
        async deleteModel(actor: DbUser, id: string): Promise<DbAiTemplate> {
            const record = await this.findModel(actor, id);
            return db
                .delete({
                    where: {
                        id: record.id
                    }
                })
                .then((v) => prepareAiTemplate(v));
        }
    });
}

export default AiTemplate(prisma.aiTemplate);
