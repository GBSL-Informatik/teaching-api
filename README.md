# Teaching Website Backend
The backend for our teaching website.

## Dev Dependencies

In order to use `.env` files, the [dotenv-cli](https://www.npmjs.com/package/dotenv-cli) must be installed globally:

```bash
yarn global add dotenv-cli
```

## Code Formatting

For a consistent code style, the project uses [Prettier](https://prettier.io/). To format the code, run

```bash
yarn run format
```

to format all typescript files.

## Environment Variables

| Variable       | Description                                       | Example                                             |
|:---------------|:--------------------------------------------------|:----------------------------------------------------|
| `DATABASE_URL` | The URL to connect to the PostgreSQL database.               | `postgresql://{user}:{pw}@localhost:5432/{db_name}` |
| `USER_EMAIL`   | The email of the user to be created on seeding.   | `reto.holz@gbsl.ch`                                 |
| `USER_ID`      | The UUID of the user to be created on seeding. \* | `fc0dfc19-d4a3-4354-afef-b5706046b368`              |

\* When using MSAL Auth, use your `localAccountId` (check your local-storage when signed in, eg. at https://ofi.gbsl.website).

These variables are stored in a `.env` file in the root directory. Make sure to not check this file into version control. Copy the `.example.env` file and fill in the values as described above.

```bash
cp .example.env .env
```

## Dev Services

## Database
### Docker Compose

Run `scripts/purge_dev_services.sh` or the `purge_dev_services` run config to remove all containers **and volumes** associated with the dev services.

Run
```bash
docker compose --file dev_services.compose.yml up
```
to start the dev services.

#### Postgres
`docker-compose` rebuilds the container PostgreSQL container on restart. When building the container, all files in `db/docker/sql` are copied to `/docker-entrypoint-initdb.d/`. They are executed by PostgreSQL **only** if **no volume exists** yet. These init files reflect the expected database setup for a production deployment, including a dedicated user for the backend.

The `db/scripts` directory contains files for purging the DB. Volumes stay intact, which means that the aforementioned init scripts will not be run again. 

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

```bash
DATABASE_URL="postgresql://teaching_website:teaching_website@localhost:5432/teaching_website"
```

#### Create the Database

Run all prisma migrations:

```bash
yarn db:migrate
```

or when you change the schema during development, run

```bash
yarn db:migrate:dev
```

to be prompted for a version name.

#### Seed Database

To seed the database with some basic *users*, *documents*, *groups* and relations between them, run

```bash
yarn db:seed
```

the seed file is located in `prisma/seed.ts`. It will create
- a user for `USER_EMAIL` and `USER_ID` from the .env file (if present)
- a test user `foo@bar.ch` with the uuid `4e90b891-7e31-4a49-9ac7-a71a0ad6863a`
- a group `test_group` with the memebers 

#### Reset Database

To reset the database, run

```bash
yarn db:reset
```

This will
- drop all tables
- drop all database types

#### Recreate Database

when you want to reset, migrate and seed the database, run

```bash
yarn db:recreate
```

### Prisma Studio

Run Prisma Studio - a simplistic local database viewer - with

```bash
yarn run prisma studio
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
