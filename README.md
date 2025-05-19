# Teaching Website Backend
The backend for our teaching website.

## Run the Project with VS Code

The Project is ready to be used with dev containers. You only need a recent version of [Docker](https://www.docker.com/). Then you can reopen the project in a devcontainer (`Ctrl+Shift+P` > `Dev Containers: Reopen in Container`).

Setup your local env - inside the devcontainer **you should not set** `DATABASE_URL` yourself.

```bash
USER_ID="<your uuid>"
USER_EMAIL="<your mail>"
USER_ROLE="ADMIN"
NO_AUTH="true"
```

The `USER_ID` and `USER_EMAIL` are used only for seeding the database and are not strictly needed.
The `USER_ID` is the `ID` attribute from the response of [Graph-Explorer/v1.0/me](https://developer.microsoft.com/en-us/graph/graph-explorer) - you need to log in first...


The Project builds and you can run
1. `yarn run db:migrate && yarn run db:seed` (needed only on the initial startup)
2. `yarn run dev`

And done...

## Dev Dependencies

In order to use `.env` files, the [dotenv-cli](https://www.npmjs.com/package/dotenv-cli) must be installed globally:

```bash
yarn global add dotenv-cli
```

## Concepts

### User Roles

A user can have one of the following roles:
- `ADMIN`: The user has full access to the system and can manage all resources. This includes
  - CRUD\* operations on all resources
  - Manage user roles and permissions
  - Access to all system settings
- `TEACHER`: The user can manage their own resources and has limited access to other users' resources. This includes
  - CRUD\* operations on their own resources
  - CRUD\* operations on StudentGroups (can create new groups, can add/remove users to/from groups they have admin access to)
  - When a teacher creates a studentGroup and adds students to this group, the students are referenced as **managed** users.
  - Can read docuements from managed users.
  - Can CRUD user- and group-permissions for managed users and administrated groups.
- `STUDENT`: The user has limited access to the system and can only manage their own resources.


\* Documents can be updated always only by the user who created them. Except the document has excplicite shared permissions with other users/groups.

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
| `ALLOWED_ORIGINS`      | A comma-separated list of origins allowed to access the api. E.g. teaching-dev.gbsl.website                                                                                                     | `localhost:3000`                                    |
| `ALLOW_SUBDOMAINS`     | Wheter subdomains from `ALLOWED_DOMAINS` should be granted access too.                                                                                                                          | `false`                                             |
| `SESSION_SECRET`       | The secret for the session cookie.\*\*\*                                                                                                                                                        | `secret`                                            |
| `MSAL_CLIENT_ID`       | The client id for the web api from Azure.                                                                                                                                                       |                                                     |
| `MSAL_TENANT_ID`       | The Tenant ID from your Azure instance                                                                                                                                                          |                                                     |
| `APP_NAME`             | The name of the app. Used for the cookie name prefix `{APP_NAME}ApiKey`                                                                                                                         | `xyzTeaching`, default: `twa`                       |
| `NETLIFY_PROJECT_NAME`  | When set to the netlify project name (e.g. `teaching-dev`), the app will allow requests from `https://deploy-preview-\d+--teaching-dev.netlify.app` and use `sameSite=none` instead of strict.                                          |                                                     |
| `ADMIN_USER_GROUP_ID`  | The UUID of the group that should be used as the admin group. For this group a RW-Permission will be always added to a newly created document root when it's access is not RW                   | default: ""                                         |
| `GITHUB_CLIENT_SECRET` | Used for the CMS to work properly. Register an app under https://github.com/settings/apps.                                                                                                      |                                                     |
| `GITHUB_CLIENT_ID`     |                                                                                                                                                                                                 |                                                     |
| `GITHUB_REDIRECT_URI`  |                                                                                                                                                                                                 |                                                     |
| `SENTRY_PROJECT`       | Error Tracking: Sentry Project Name, e.g. `events-api`.                                                                                                                                         |                                                     |
| `SENTRY_ORG`           | Error Tracking: Sentry Organisation, e.g. your sentry username.                                                                                                                                 |                                                     |
| `SENTRY_DSN`           | Error Tracking: Sentry DSN.                                                                                                                                                                     |                                                     |
| `SENTRY_AUTH_TOKEN`    | Error Tracking: Auth token for uploading sourcemaps to sentry. Get it by configuring your app with `npx @sentry/wizard@latest -i sourcemaps`.                                                   |                                                     |

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
### connect to current db
```bash
psql -d postgres -h localhost -U teaching_website -d teaching_website
```

### delete last migration
```sql
DELETE FROM _prisma_migrations WHERE started_at = (SELECT MAX(started_at)FROM _prisma_migrations);
```

### undo your migration, e.g. drop a view or remove a column
```sql
drop view view_name; -- drop view
ALTER TABLE table_name DROP COLUMN column_name; -- drop column
```

### disconnect
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
dokku config:set dev-teaching-api ALLOWED_ORIGINS="tdev.tld"
dokku config:set dev-teaching-api ALLOW_SUBDOMAINS="false"

mkdir /home/dokku/dev-teaching-api/nginx.conf.d/
echo 'client_max_body_size 5m;' > /home/dokku/dev-teaching-api/nginx.conf.d/upload.conf
chown dokku:dokku /home/dokku/dev-teaching-api/nginx.conf.d/upload.conf
service nginx reload

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