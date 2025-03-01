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

| Variable               | Description                                                                                                                                                                                     | Example                                             |
|:-----------------------|:------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|:----------------------------------------------------|
| `DATABASE_URL`         | The URL to connect to the PostgreSQL database.                                                                                                                                                  | `postgresql://{user}:{pw}@localhost:5432/{db_name}` |
| `USER_EMAIL`           | The email of the user to be created on seeding.                                                                                                                                                 | `reto.holz@gbsl.ch`                                 |
| `USER_ID`              | The UUID of the user to be created on seeding. \*                                                                                                                                               | `fc0dfc19-d4a3-4354-afef-b5706046b368`              |
| `NO_AUTH`              | If set (and not running `production` mode), clients can authenticate as any user by supplying `{'email': 'some@email.ch'}` in the `Auhorization` header, for any user email in the database\*\* | `NO_AUTH=true`                                      |
| `PORT`                 | (optional) The port the server should listen on.                                                                                                                                                | `3002` (default)                                    |
| `FRONTEND_URL`         | The URL of the frontend.                                                                                                                                                                        | `http://localhost:3000`                             |
| `SESSION_SECRET`       | The secret for the session cookie.\*\*\*                                                                                                                                                        | `secret`                                            |
| `MSAL_CLIENT_ID`       | The client id for the web api from Azure.                                                                                                                                                       |                                                     |
| `MSAL_TENANT_ID`       | The Tenant ID from your Azure instance                                                                                                                                                          |                                                     |
| `APP_NAME`             | The name of the app. Used for the cookie name prefix `{APP_NAME}ApiKey`                                                                                                                         | `xyzTeaching`, default: `twa`                       |
| `WITH_DEPLOY_PREVIEW`  | When set to `true`, the app will allow requests from `https://deploy-preview-\d+--teaching-dev.netlify.app` and use `sameSite=none` instead of strict.                                          |                                                     |
| `ADMIN_USER_GROUP_ID`  | The UUID of the group that should be used as the admin group. For this group a RW-Permission will be always added to a newly created document root when it's access is not RW                   | default: ""                                         |
| `GITHUB_CLIENT_SECRET` | Used for the CMS to work properly. Register an app under https://github.com/settings/apps.                                                                                                      |                                                     |
| `GITHUB_CLIENT_ID`     |                                                                                                                                                                                                 |                                                     |
| `GITHUB_REDIRECT_URI`  |                                                                                                                                                                                                 |                                                     |

\* When using MSAL Auth, use your `localAccountId` (check your local-storage when signed in, eg. at https://ofi.gbsl.website).<br/>
\*\* To change users, clear LocalStorage to delete the API key created upon first authentication.<br/>
\*\*\* Generate a secret with `openssl rand -base64 32`.

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
`docker compose` rebuilds the container PostgreSQL container on restart. When building the container, all files in `db/docker/sql` are copied to `/docker-entrypoint-initdb.d/`. They are executed by PostgreSQL **only** if **no volume exists** yet. These init files reflect the expected database setup for a production deployment, including a dedicated user for the backend.

The `db/scripts` directory contains files for purging the DB. Volumes stay intact, which means that the aforementioned init scripts will not be run again. 

The following users are created:
- Admin: `postgres` / `qSpEx2Zz8BS9`
- User for DB `teaching_api`: `teaching_api` / `zW4SMEXLHpXXxxk`

→ For the teaching-api, the resulting DB URL is `postgresql://teaching_api:zW4SMEXLHpXXxxk@localhost:5432/teaching_api`.

#### Local Setup

To set up a local dev database, run

```bash
psql postgres # sudo -u postgres psql

postgres=> CREATE ROLE teaching_api WITH LOGIN PASSWORD 'teaching_api';
postgres=> ALTER ROLE teaching_api CREATEDB;
postgres=> \du
postgres=> \q

psql -d postgres -h localhost -U teaching_api

postgres=> CREATE DATABASE teaching_api;
postgres=> CREATE DATABASE teaching_api_test; # for testing
postgres=> \list
postgres=> \c teaching_api
```

make sure to set the db-name and the password in the `.env` file:

```bash
DATABASE_URL="postgresql://teaching_api:teaching_api@localhost:5432/teaching_api"
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

### Undo last migration (dev mode only!!!!)
# connect to current db
```bash
psql -d postgres -h localhost -U teaching_website -d teaching_website
```

# delete last migration
```sql
DELETE FROM _prisma_migrations WHERE started_at = (SELECT MAX(started_at)FROM _prisma_migrations);
```

# undo your migration, e.g. drop a view or remove a column
```sql
drop view view_name; -- drop view
ALTER TABLE table_name DROP COLUMN column_name; -- drop column
```

# disconnect
\q

## Deployment
### PostgreSQL
- Set up a database and user according to the scripts in `db/docker/sql`.
- Create the required tables according to `db/scripts/01_create_tables.sql` (probably...).

## Next steps
- Introduce an ORM and connect to DB.
- Introduce passport.js and set up a first authenticated endpoint (username / password)



## Dokku

```bash
dokku apps:create dev-teaching-api
dokku domains:add dev-teaching-api domain.tld

dokku postgres:create dev-teaching-api
dokku postgres:link dev-teaching-api dev-teaching-api

dokku config:set dev-teaching-api MSAL_CLIENT_ID="XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
dokku config:set dev-teaching-api MSAL_TENANT_ID="XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
dokku config:set --no-restart dev-teaching-api DOKKU_LETSENCRYPT_EMAIL="foo@bar.ch"
dokku config:set dev-teaching-api SESSION_SECRET="$(openssl rand -base64 32)"
dokku config:set dev-teaching-api FRONTEND_URL="https://..."

dokku nginx:set dev-teaching-api client-max-body-size 5m

dokku nginx:set dev-teaching-api x-forwarded-proto-value '$http_x_forwarded_proto'
dokku nginx:set dev-teaching-api x-forwarded-for-value '$http_x_forwarded_for'
dokku nginx:set dev-teaching-api x-forwarded-port-value '$http_x_forwarded_port'

# backup db
# dokku postgres:backup-auth dev-teaching-api <aws-access-key-id> <aws-secret-access-key> <aws-default-region> <aws-signature-version> <endpoint-url> 
dokku postgres:backup-auth dev-teaching-api <aws-access-key-id> <aws-secret-access-key> auto s3v4 https://92bdb68939987bdbf6207ccde70891de.eu.r2.cloudflarestorage.com
dokku postgres:backup dev-teaching-api <bucket-name>
dokku postgres:backup-set-encryption dev-teaching-api <GPG-Key>
dokku postgres:backup-schedule dev-teaching-api "0 3 * * *" fs-informatik # daily backup at 3am


######### on local machine #########
# 1. add the remote to your project:
git remote add dokku dokku@<dokku-ip>:dev-teaching-api
# 2. push the code to the dokku server:
git push dokku
# or if you want to push a branch other than the main:
# git push dokku <branch>:main

################# on the server ################# - firs one who does it...
dokku letsencrypt:enable dev-teaching-api
## when it succeeds, re-enable the cloudflare proxy for domain.tld...
```

### Speed Improvements
If the API and the Database are running on the same server, you can improve the speed by disabling the tcp connection for the database. This can be done by setting the `DATABASE_URL` to `postgresql://teaching_website:teaching_website@localhost/teaching_website?sslmode=disable`.

## Troubleshooting

> [!Caution]
> Authentication Error: When your API can not authenticate requests
>  - set the debug level in authConfig to 'info' and check the logs
>  - when it is a 401 error and the issue is about `Strategy.prototype.jwtVerify can not verify the token`, ensure to set `"requestedAccessTokenVersion": 2` in the API manifest (!! **not** in the Frontend's manifest, there it must still be `null` !!)


## CMS

For the cms to work properly, you need to register a github app under https://github.com/settings/apps. The following settings are required:

- Callback URL:
    - `http://localhost:3000/gh-callback` for local development
    - `https://teaching-dev.domain.ch/gh-callback` for the productive environment
    - No whitelist-URL's can be added, so you'd need to add for each deploy-preview a separate url...