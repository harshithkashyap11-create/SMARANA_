import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../src/features/patient/", import.meta.url));
async function files(dir) { return (await readdir(dir, { withFileTypes: true })).flatMap((x) => x.isDirectory() ? [] : [join(dir, x.name)]).concat(...await Promise.all((await readdir(dir, { withFileTypes: true })).filter((x) => x.isDirectory()).map((x) => files(join(dir, x.name))))); }
const offenders = [];
for (const file of await files(root)) { if (!/\.(tsx?|json)$/.test(file) || file.includes(".test.")) continue; const text = await readFile(file, "utf8"); const literals = [...text.matchAll(/["'`]([^\n"'`]*\b(?:sync|failed|error)\b[^\n"'`]*)["'`]/gi)]; if (literals.length) offenders.push(`${file}: ${literals[0][1]}`); }
if (offenders.length) { console.error(offenders.join("\n")); process.exit(1); }
