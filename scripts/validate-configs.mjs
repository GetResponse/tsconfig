#!/usr/bin/env node
// Compiles a fixture project against every shipped tsconfig using whatever
// `typescript` is currently installed (see README/CI: this is run once per
// supported major, e.g. `npm install --no-save typescript@6` then
// `npm install --no-save typescript@7`, to catch compilerOptions that only
// break under one of the supported majors).
//
// The fixture has a relative import written with an explicit ".js"
// extension (`./helper.js`, importing from `helper.ts`) because that's
// mandatory for the "nodenext"-resolution configs (TS2835 otherwise) and
// also valid under "bundler" resolution, so the same fixture shape works
// for every config. Configs whose consumers must set "type": "module" (see
// README) get a package.json saying so, so this also exercises the emitted
// module format, not just that resolution succeeds.
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readdirSync, readFileSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const require = createRequire(import.meta.url);
const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const configsDir = join(repoRoot, 'configs');

// Relative to configsDir. Configs not listed here get no package.json in
// their fixture dir (defaults to CommonJS), matching what their
// "moduleResolution": "bundler" consumers actually run under.
const REQUIRES_ESM_PACKAGE_TYPE = new Set([
  'tsconfig.base.json',
  'lib/tsconfig.esm.json',
  'node-lts/tsconfig.json',
]);

function findConfigs(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return findConfigs(full);
    return entry.name.endsWith('.json') ? [full] : [];
  });
}

// Resolved via the package directory + its "bin" field (not
// require.resolve('typescript/bin/tsc')) because TypeScript 7's
// package.json "exports" map no longer exposes that subpath, even though
// the file itself still exists there.
const typescriptPkgPath = require.resolve('typescript/package.json');
const typescriptPkg = JSON.parse(readFileSync(typescriptPkgPath, 'utf8'));
const tscBin = join(dirname(typescriptPkgPath), typescriptPkg.bin.tsc);
const tscVersion = typescriptPkg.version;
const configs = findConfigs(configsDir);

console.log(`Validating ${configs.length} config(s) against typescript@${tscVersion}`);

// Created under the repo root (not os.tmpdir()) so that "types": ["node"]
// resolves against this repo's node_modules/@types while walking up parents.
const workDir = mkdtempSync(join(repoRoot, '.tmp-validate-'));

async function validateConfig(configPath) {
  const label = relative(configsDir, configPath);
  const configWorkDir = join(workDir, label.replace(/[\\/]/g, '_'));
  const srcDir = join(configWorkDir, 'src');
  mkdirSync(srcDir, { recursive: true });

  if (REQUIRES_ESM_PACKAGE_TYPE.has(label)) {
    writeFileSync(join(configWorkDir, 'package.json'), JSON.stringify({ type: 'module' }));
  }
  writeFileSync(join(srcDir, 'helper.ts'), 'export const helper = 1;\n');
  writeFileSync(join(srcDir, 'index.ts'), "import { helper } from './helper.js';\nexport const fixture = helper;\n");

  const wrapperPath = join(configWorkDir, 'tsconfig.json');
  writeFileSync(
    wrapperPath,
    JSON.stringify(
      {
        extends: relative(configWorkDir, configPath),
        compilerOptions: { rootDir: './src', outDir: './dist' },
        include: ['src/**/*'],
      },
      null,
      2,
    ),
  );

  try {
    await execFileAsync(process.execPath, [tscBin, '-p', wrapperPath, '--noEmit']);
    return { label, ok: true };
  } catch (error) {
    const output = [error.stdout, error.stderr]
      .filter(Boolean)
      .map((chunk) => chunk.toString())
      .join('')
      .trim();
    return { label, ok: false, output: output || error.message };
  }
}

const results = await Promise.all(configs.map(validateConfig));

rmSync(workDir, { recursive: true, force: true });

let failed = false;
for (const result of results) {
  if (result.ok) {
    console.log(`  ok   ${result.label}`);
  } else {
    failed = true;
    console.error(`  FAIL ${result.label}`);
    console.error(result.output);
  }
}

if (failed) {
  console.error(`\nOne or more configs failed to compile under typescript@${tscVersion}.`);
  process.exit(1);
}

console.log(`\nAll configs compiled cleanly under typescript@${tscVersion}.`);
