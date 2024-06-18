# Teaching Website Backend
The backend for my teaching website.

## Dev Dependencies

In order to use `.env` files, the [dotenv-cli](https://www.npmjs.com/package/dotenv-cli) shall be installed globally:

```bash
yarn global add dotenv-cli
```

## Dev Services

Run `scripts/purge_dev_services.sh` or the `purge_dev_services` run config to remove all containers **and volumes** associated with the dev services.

Run
```bash
docker compose --file dev_services.compose.yml up
```
to start the dev services.

### Postgres
`docker-compose` rebuilds the container PostgreSQL container on restart. When building the container, all files in `db/docker/sql` are copied to `/docker-entrypoint-initdb.d/`. They are executed by PostgreSQL **only** if **no volume exists** yet. These init files reflect the expected database setup for a production deployment, including a dedicated user for the backend.

The `db/scripts` directory contains files for creating tables, as well as seeding and purging the DB. Volumes stay intact, which means that the aforementioned init scripts will not be run again. 

The following users are created:
- Admin: `postgres` / `qSpEx2Zz8BS9`
- User for DB `teaching_website`: `teaching_website_backend` / `zW4SMEXLHpXXxxk`

#### Local Setup
To set up a local dev database, run

```bash
psql postgres # sudo -u postgres psql

postgres=> CREATE ROLE teaching_website WITH LOGIN PASSWORD 'teaching_website';
postgres=> ALTER ROLE teaching_website CREATEDB;
postgres=> \du
postgres=> \q

psql -d postgres -h localhost -U teaching_website

postgres=> CREATE DATABASE teaching_website;
postgres=> CREATE DATABASE teaching_website_test; # for testing
postgres=> \list
postgres=> \c teaching_website
```

make sure to set the db-name and the password in the `.env` file:

```
DATABASE_URL="postgresql://teaching_website:teaching_website@localhost:5432/teaching_website"
```

Now run all prisma migrations:

```bash
yarn run prisma migrate dev
```


### Generate Database Documentation

run

```bash
yarn run prisma generate
```

this will generate
- [docs](public/prisma-docs/index.html) with the [prisma-docs-generator](https://github.com/pantharshit00/prisma-docs-generator)
- [schema.dbml](prisma/dbml/schema.dbml) with the [prisma-dbml-generator](https://notiz.dev/blog/prisma-dbml-generator)

the docs will be publically available under `/prisma/index.html`.


## Deployment
### PostgreSQL
- Set up a database and user according to the scripts in `db/docker/sql`.
- Create the required tables according to `db/scripts/01_create_tables.sql` (probably...).

## Next steps
- Introduce an ORM and connect to DB.
- Introduce passport.js and set up a first authenticated endpoint (username / password)
