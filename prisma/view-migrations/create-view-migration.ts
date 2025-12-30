import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { default as parseArgs } from 'minimist';
import { exit } from 'process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const currentDir = __dirname;
const CONFIG_FILENAME = 'migrate.config.yml' as const;
interface Config {
    name: string;
    depends_on: string[];
}
const config = yaml.load(fs.readFileSync(path.resolve(currentDir, CONFIG_FILENAME), 'utf8')) as Config[];
const HELP_TEXT = `
yarn run db:migrate-view [view-name [view-name ...]]

Example:
  yarn run db:migrate-view view__users_documents view__document_user_permissions

available views (configured in ${CONFIG_FILENAME}):
${config.map((c) => ` - ${c.name}`).join('\n')}
`;

const argv = parseArgs(process.argv.slice(2));

if (argv.help) {
    console.log(HELP_TEXT);
    exit(0);
}

const viewNames = argv._.filter(Boolean);
if (viewNames.length === 0) {
    console.error('Error: No view name provided.');
    console.log(HELP_TEXT);
    exit(1);
}
if (viewNames.some((viewName) => !config.find((c) => c.name === viewName))) {
    console.error(
        'Error: Invalid view name provided. Unknown views:\n',
        viewNames
            .filter((viewName) => !config.find((c) => c.name === viewName))
            .map((n) => `- ${n}`)
            .join(`\n`),
        `\nCheck ${CONFIG_FILENAME} to configure additional views.`
    );
    console.log(HELP_TEXT);
    exit(1);
}

async function createViewMigration(viewNames: string[]) {
    const migrationsFor: string[] = [];
    const gatherDependencies = (viewName: string) => {
        const viewConfig = config.find((c) => c.name === viewName);
        if (!viewConfig) {
            throw new Error(`View configuration for "${viewName}" not found.`);
        }
        const idx = migrationsFor.findIndex((name) => name === viewName);
        if (idx >= 0) {
            return;
        }
        const dependents = config.filter((dep) => dep.depends_on.includes(viewName)).map((d) => d.name);
        for (const dep of dependents) {
            gatherDependencies(dep);
        }
        if (!migrationsFor.includes(viewName)) {
            migrationsFor.push(viewName);
        }
    };
    viewNames.forEach(gatherDependencies);
    console.log(migrationsFor.join(' -> '));

    const commands: string[] = [];
    commands.push(
        `-- NEVER MODIFY THIS FILE MANUALLY! IT IS AUTO-GENERATED USING prisma/view-migrations/create-view-migration.ts`
    );
    migrationsFor.forEach((viewName) => {
        commands.push(`DROP VIEW IF EXISTS ${viewName};`);
    });
    for (const viewName of migrationsFor.toReversed()) {
        const viewSqlPath = path.resolve(currentDir, 'views', `${viewName}.sql`);
        const viewSql = await fs.promises.readFile(viewSqlPath, 'utf8');
        commands.push(`
CREATE VIEW ${viewName} AS
${viewSql
    .replace(/;+\s*$/, '')
    .trim()
    .split('\n')
    .map((line) => `    ${line}`)
    .join('\n')};
`);
    }
    const migrationContent = commands.join('\n\n');
    const timestamp = new Date()
        .toISOString()
        .replace(/[-:TZ.]/g, '')
        .slice(0, 14);
    const migrationFilename = `${timestamp}_create_views__${viewNames.map((name) => name.replace(/^view__/, '')).join('__')}`;
    const migrationsDir = path.resolve(currentDir, '..', 'migrations', migrationFilename);
    await fs.promises.mkdir(migrationsDir, { recursive: true });
    const migrationFilePath = path.resolve(migrationsDir, 'migration.sql');
    await fs.promises.writeFile(migrationFilePath, migrationContent, 'utf8');
    console.log(`✅ Created view migration at: ${migrationFilePath}`);
}

createViewMigration(viewNames);
