import { execSync, ExecSyncOptions } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

const workerPath = join(process.cwd(), 'worker');

exec(`npx wrangler d1 migrations create revelio-db ${process.argv.slice(2).join(' ')}`, {
  cwd: workerPath,
});

exec(
  `npx prisma migrate diff --from-local-d1 --to-schema-datamodel ../prisma/schema.prisma --script --output migrations/${getLastMigrationName()}`,
  {
    cwd: workerPath,
  },
);

exec(`npx wrangler d1 migrations apply revelio-db --local`, {
  cwd: workerPath,
});

exec(`npx prisma generate`);

function getLastMigrationName() {
  const files = readdirSync(join(workerPath, 'migrations'));

  return files[files.length - 1];
}

function exec(cmd: string, options?: ExecSyncOptions) {
  console.log(cmd);

  execSync(cmd, { stdio: 'inherit', ...(options ?? {}) });
}
