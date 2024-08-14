import { Prisma, PrismaClient } from '@prisma/client';

const options: Prisma.PrismaClientOptions & {
    log: (Prisma.LogDefinition | { emit: 'event'; level: 'query' })[];
} = {} as any;
if (process.env.LOG) {
    options.log = [
        {
            emit: 'event',
            level: 'query'
        },
        {
            emit: 'stdout',
            level: 'error'
        },
        {
            emit: 'stdout',
            level: 'info'
        },
        {
            emit: 'stdout',
            level: 'warn'
        }
    ];
}
const prisma = new PrismaClient(options);

if (process.env.LOG) {
    prisma.$on('query', (e) => {
        console.log(`Query: ${e.query}; ${e.params.slice(0, 120)}; -- ${e.duration}ms`);
    });
}

export default prisma;
