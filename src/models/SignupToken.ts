import { PrismaClient, SignupToken as DbSignupToken, User, Prisma } from '@prisma/client';
import prisma from '../prisma';
import { hasElevatedAccess } from './User';
import { HTTP403Error, HTTP404Error } from '../utils/errors/Errors';
import { createDataExtractor } from '../helpers/dataExtractor';

const getData = createDataExtractor<Prisma.SignupTokenUncheckedUpdateInput>(
    [],
    ['method', 'description', 'validThrough', 'maxUses', 'disabled']
);

function SignupToken(db: PrismaClient['signupToken']) {
    return Object.assign(db, {
        async findModel(id: string, actor?: User): Promise<DbSignupToken | null> {
            // TODO: If no actor or actor without elevated access, restrict fields (no uses, maybe no max uses, etc.).
            return db.findUnique({
                where: { id }
            });
        },
        async all(actor: User): Promise<DbSignupToken[]> {
            // TODO: Do we need to restrict the tokens to only the ones created by this actor, unless they are admin?
            if (!hasElevatedAccess(actor.role)) {
                throw new HTTP403Error('Insufficient access permission');
            }
            return db.findMany({});
        },
        async createModel(
            actor: User,
            method: string, // TODO: Restrict to enum?
            description: string,
            validThrough?: Date,
            maxUses?: number,
            disabled?: boolean
            // TODO: Default student groups.
        ): Promise<DbSignupToken> {
            if (!hasElevatedAccess(actor.role)) {
                throw new HTTP403Error('Insufficient access permission');
            }

            return db.create({
                data: {
                    method,
                    description,
                    validThrough,
                    maxUses,
                    disabled
                }
            });
        },
        async updateModel(actor: User, data: Partial<DbSignupToken>, id: string): Promise<DbSignupToken> {
            const record = await this.findModel(id, actor);
            if (!record) {
                throw new HTTP404Error('Signup token not found');
            }
            if (!hasElevatedAccess(actor.role)) {
                throw new HTTP403Error('Insufficient access permission');
            }
            const sanitized = getData(data, false, true);
            return db.update({
                where: { id },
                data: sanitized
            });
        },
        async deleteModel(actor: User, id: string): Promise<DbSignupToken> {
            const record = await this.findModel(id);
            if (!record) {
                throw new HTTP404Error('Signup token not found');
            }

            if (!hasElevatedAccess(actor.role)) {
                throw new HTTP403Error('Insufficient access permission');
            }

            return db.delete({
                where: {
                    id: id
                }
            });
        }
        // TODO: Update (maxUses, validThrough, disabled, description).
    });
}

export default SignupToken(prisma.signupToken);
