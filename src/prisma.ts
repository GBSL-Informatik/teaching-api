import { Prisma, PrismaClient } from '../prisma/generated/client';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = `${process.env.DATABASE_URL}`;

const adapter = new PrismaPg({ connectionString: connectionString, connectionTimeoutMillis: 5_000 });

const LOG_OPTIONS: Prisma.PrismaClientOptions['log'] = [
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

const prisma = new PrismaClient({ adapter: adapter, log: process.env.LOG ? LOG_OPTIONS : ['warn', 'error'] });
// prisma.$connect();

if (process.env.LOG) {
    prisma.$on('query', (e) => {
        console.log(`Query: ${e.query}; ${e.params.slice(0, 120)}; -- ${e.duration}ms`);
    });
}

export default prisma;
