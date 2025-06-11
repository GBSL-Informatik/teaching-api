import { PrismaClient, User as DbUser, AiRequest as DbAiRequest } from '@prisma/client';
import prisma from '../prisma';
import { HTTP403Error } from '../utils/errors/Errors';
import _ from 'lodash';
import OpenAI from 'openai';

function AiRequest(db: PrismaClient['aiRequest']) {
    return Object.assign(db, {
        async findModel(actor: DbUser, aiTemplateId: string, id: string): Promise<DbAiRequest> {
            return db.findUniqueOrThrow({ where: { id: id, aiTemplateId: aiTemplateId, userId: actor.id } });
        },
        async all(actor: DbUser, aiTemplateId: string): Promise<DbAiRequest[]> {
            const requests = await db.findMany({
                where: {
                    userId: actor.id,
                    aiTemplateId: aiTemplateId
                }
            });
            return requests;
        },
        async createModel(
            actor: DbUser,
            aiTemplateId: string,
            input: string,
            onResponse?: (aiRequest: DbAiRequest) => void
        ): Promise<DbAiRequest> {
            const template = await prisma.aiTemplate.findUniqueOrThrow({
                where: { id: aiTemplateId }
            });
            if (!template.isActive) {
                throw new HTTP403Error('This AI template is not active');
            }
            const previousRequests = await this.all(actor, aiTemplateId);
            const now = new Date();
            const withinRateLimit = previousRequests.filter((request) => {
                if (request.status === 'error') {
                    return false; // Ignore requests with error status
                }
                const requestTime = new Date(request.createdAt);
                return now.getTime() - requestTime.getTime() <= template.rateLimitPeriodMs;
            });
            if (withinRateLimit.length >= template.rateLimit) {
                throw new HTTP403Error('Rate limit exceeded for this AI template');
            }

            const client = new OpenAI({
                apiKey: template.apiKey,
                baseURL: template.apiUrl
            });

            const templateConfig =
                template.config as unknown as OpenAI.Responses.ResponseCreateParamsNonStreaming;
            const config: OpenAI.Responses.ResponseCreateParamsNonStreaming = {
                ...templateConfig,
                input: Array.isArray(templateConfig.input)
                    ? (templateConfig.input as OpenAI.Responses.ResponseInput)
                    : [templateConfig.input as unknown as OpenAI.Responses.ResponseInputItem]
            };

            (config.input as OpenAI.Responses.ResponseInput).push({
                role: 'user',
                content: [
                    {
                        type: 'input_text',
                        text: input
                    }
                ]
            });

            const aiRequest = await db.create({
                data: {
                    userId: actor.id,
                    aiTemplateId: aiTemplateId,
                    request: input,
                    status: 'pending',
                    response: {}
                }
            });

            client.responses
                .create(config)
                .then((response) => {
                    db.update({
                        where: { id: aiRequest.id },
                        data: {
                            status: response.error ? 'error' : 'completed',
                            response: response.error ? response.error : JSON.parse(response.output_text)
                        }
                    }).then((updatedRequest) => {
                        onResponse?.(updatedRequest);
                    });
                })
                .catch((error) => {
                    db.update({
                        where: { id: aiRequest.id },
                        data: {
                            status: 'error',
                            response: {
                                error: error.message || 'Unknown error occurred'
                            }
                        }
                    }).then((updatedRequest) => {
                        onResponse?.(updatedRequest);
                    });
                });
            return aiRequest;
        }
    });
}

export default AiRequest(prisma.aiRequest);
