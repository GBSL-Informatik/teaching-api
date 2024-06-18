import { Prisma } from '@prisma/client';
import prisma from '../src/prisma';


async function main() {
    const { DATABASE_URL } = process.env;
    const user = DATABASE_URL?.split(':')[1].split('//')[1];
    const dropTableSql = await prisma.$queryRaw<{query: string}[]>(
        Prisma.sql`
            SELECT 'drop table if exists "' || tablename || '" cascade;' as query
            FROM pg_tables
            WHERE tableowner = ${user};
        `
    );
    /** ensure drops happen sequential to prevent deadlocks (because of the cascade) */
    for (let i = 0; i < dropTableSql.length; i++) {
        const table = dropTableSql[i].query.split(' ')[4];
        const r = await prisma.$queryRawUnsafe(dropTableSql[i].query);
        console.log(`Dropped table ${table}`);
    }
    const dropTypeSql = await prisma.$queryRaw<{query: string}[]>(
        Prisma.sql`
            SELECT 'drop type if exists "' || pg_type.typname || '" cascade;' as query
            FROM pg_type
            JOIN pg_namespace ON pg_namespace.oid = pg_type.typnamespace
            WHERE pg_type.typowner = (SELECT usesysid FROM pg_user WHERE usename = ${user})
                AND pg_namespace.nspname NOT IN ('pg_catalog', 'information_schema');
        `
    );
    /** ensure drops happen sequential to prevent deadlocks (because of the cascade) */
    for (let i = 0; i < dropTypeSql.length; i++) {
        const table = dropTypeSql[i].query.split(' ')[4];
        const r = await prisma.$queryRawUnsafe(dropTypeSql[i].query);
        console.log(`Dropped type ${table}`);
    }


}

main()
    .catch((e) => console.error(e))
    .finally(async () => await prisma.$disconnect());
