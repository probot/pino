import { readdirSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { test } from "tap";

const __dirname = dirname(fileURLToPath(import.meta.url));

const packageLockJson = JSON.parse(
  readFileSync(join(__dirname, "../package-lock.json"), "utf8"),
);

const npxImportRE = /npxImport(?:<[^>]+>)?\("([^"]+)/gu;

const checkForFixedNpxImport = (dir, pkg, version) => {
  let files;
  if (statSync(dir).isDirectory()) {
    files = readdirSync(dir);
  } else {
    files = [basename(dir)];
    dir = dirname(dir);
  }

  for (let i = 0; i < files.length; i++) {
    let file = join(dir, files[i]);
    if (statSync(file).isDirectory()) {
      checkForFixedNpxImport(file, pkg, version);
    } else {
      if (file.endsWith(".js")) {
        const fileContent = readFileSync(file, "utf8"); // Ensure the file is readable
        const matches = npxImportRE.exec(fileContent);
        if (matches) {
          if (
            matches[1].startsWith(pkg) &&
            matches[1] !== `${pkg}@${version}`
          ) {
            throw new Error(
              `Found npxImport for ${matches[1]} in ${file}, expected version ${pkg}@${version}. Please update the import to use the fixed version.`,
            );
          }
        }
      }
    }
  }
};

test("should be ensured that smee-client is the same version as in the package-lock.json", (t) => {
  t.plan(2);
  t.strictSame(
    packageLockJson.packages["node_modules/@sentry/node"].version,
    "9.38.0",
    "Ensure that @sentry/node version is set to 9.38.0 in package-lock.json",
  );
  checkForFixedNpxImport(
    join(__dirname, "../index.js"),
    "@sentry/node",
    packageLockJson.packages["node_modules/@sentry/node"].version,
  );
  t.ok(true, "passed npxImport check for @sentry/node");
});
