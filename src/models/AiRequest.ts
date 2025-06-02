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
        async createModel(actor: DbUser, aiTemplateId: string, input: string): Promise<DbAiRequest> {
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

            const requestInput: OpenAI.Responses.ResponseInput = [];
            if (template.systemMessage) {
                requestInput.push({
                    role: 'system',
                    content: [
                        {
                            type: 'input_text',
                            text: template.systemMessage
                        }
                    ]
                });
            }
            requestInput.push({
                role: 'user',
                content: [
                    {
                        type: 'input_text',
                        text: input
                    }
                ]
            });

            const response = await client.responses.create({
                model: template.model,
                input: requestInput,
                text: {
                    format: template.jsonSchema
                        ? {
                              type: 'json_schema',
                              name: 'tdev_ai_response',
                              schema: {},
                              ...(template.jsonSchema! as unknown as Partial<OpenAI.ResponseFormatJSONSchema>)
                          }
                        : ({ type: 'text' } as OpenAI.ResponseFormatText)
                },
                reasoning: {},
                tools: [],
                temperature: template.temperature,
                max_output_tokens: template.maxTokens,
                top_p: template.topP,
                store: false
            });

            const aiRequest = await db.create({
                data: {
                    userId: actor.id,
                    aiTemplateId: aiTemplateId,
                    request: input,
                    response: JSON.parse(response.output_text),
                    status: 'success'
                }
            });
            return aiRequest;
        }
    });
}

export default AiRequest(prisma.aiRequest);
