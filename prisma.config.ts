import 'dotenv/config';
import path from 'node:path';

import type { PrismaConfig } from 'prisma';

export default {
    experimental: {
        adapter: true
    },
    migrations: {
        seed: 'dotenv -- ts-node prisma/seed.ts'
    }
    // now you can use process.env variables
} satisfies PrismaConfig;
