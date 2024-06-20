import { Prisma, PrismaClient } from '@prisma/client';

const options: Prisma.PrismaClientOptions = {};
if (process.env.LOG) {
    options.log = ['query', 'info', 'warn'];
}
const prisma = new PrismaClient(options);

export default prisma;
