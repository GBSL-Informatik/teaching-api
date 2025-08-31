import { PrismaPg } from '@prisma/adapter-pg';
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

const connectionString = `${process.env.DATABASE_URL}`;

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ ...options, adapter: adapter });
prisma.$connect();

if (process.env.LOG) {
    prisma.$on('query', (e) => {
        console.log(`Query: ${e.query}; ${e.params.slice(0, 120)}; -- ${e.duration}ms`);
    });
}

export default prisma;
