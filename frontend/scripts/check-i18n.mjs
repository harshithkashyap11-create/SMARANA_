import { readFile } from "node:fs/promises";

const localeDirectory = new URL("../src/shared/i18n/", import.meta.url);
const locales = ["en", "as", "bn"];

function flattenKeys(value, prefix = "") {
  return Object.entries(value).flatMap(([key, nestedValue]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return nestedValue !== null && typeof nestedValue === "object"
      ? flattenKeys(nestedValue, path)
      : [path];
  });
}

const catalogs = await Promise.all(
  locales.map(async (locale) => {
    const contents = await readFile(
      new URL(`${locale}.json`, localeDirectory),
      "utf8",
    );
    return [locale, new Set(flattenKeys(JSON.parse(contents)))];
  }),
);

const expected = catalogs[0][1];
let hasMismatch = false;

for (const [locale, keys] of catalogs.slice(1)) {
  const missing = [...expected].filter((key) => !keys.has(key));
  const extra = [...keys].filter((key) => !expected.has(key));

  if (missing.length > 0 || extra.length > 0) {
    hasMismatch = true;
    console.error(
      `${locale}: missing [${missing.join(", ")}], extra [${extra.join(", ")}]`,
    );
  }
}

if (hasMismatch) {
  process.exitCode = 1;
} else {
  console.log(`i18n catalogs match (${expected.size} keys).`);
}
