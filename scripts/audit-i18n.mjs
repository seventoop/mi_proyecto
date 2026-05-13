import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const dictionariesDir = path.join(root, "lib", "i18n", "dictionaries");
const es = readJson(path.join(dictionariesDir, "es.json"));
const en = readJson(path.join(dictionariesDir, "en.json"));

const args = new Set(process.argv.slice(2));
const strictHardcoded = args.has("--strict-hardcoded") || process.env.I18N_STRICT_HARDCODED === "1";
const allowedEqualValues = new Set(["SevenToop", "Email", "WhatsApp", "CRM", "KYC", "USD", "VIP"]);

const missingInEn = diffKeys(es, en);
const missingInEs = diffKeys(en, es);
const emptyValues = [...findEmptyValues(es, "es"), ...findEmptyValues(en, "en")];
const suspiciousEqualValues = findEqualLeafValues(es, en).filter(
  ({ value }) => !allowedEqualValues.has(String(value)),
);
const hardcodedSpanish = scanHardcodedSpanish();

printSection("Dictionary key parity", [
  ...missingInEn.map((key) => `Missing in en: ${key}`),
  ...missingInEs.map((key) => `Missing in es: ${key}`),
]);
printSection("Empty dictionary values", emptyValues);
printSection(
  "Equal es/en leaf values",
  suspiciousEqualValues.map(({ key, value }) => `${key}: ${JSON.stringify(value)}`),
);
printSection(
  "Hardcoded Spanish UI candidates",
  hardcodedSpanish.map((item) => `${item.file}:${item.line} ${item.text}`),
);

const hasDictionaryErrors = missingInEn.length || missingInEs.length || emptyValues.length;
const hasHardcodedErrors = strictHardcoded && hardcodedSpanish.length;

if (hasDictionaryErrors || hasHardcodedErrors) {
  process.exitCode = 1;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function flattenKeys(value, prefix = "") {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => flattenKeys(item, `${prefix}[${index}]`));
  }
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, child]) =>
      flattenKeys(child, prefix ? `${prefix}.${key}` : key),
    );
  }
  return [prefix];
}

function diffKeys(source, target) {
  const targetKeys = new Set(flattenKeys(target));
  return flattenKeys(source).filter((key) => !targetKeys.has(key)).sort();
}

function findEmptyValues(value, locale, prefix = "") {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => findEmptyValues(item, locale, `${prefix}[${index}]`));
  }
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, child]) =>
      findEmptyValues(child, locale, prefix ? `${prefix}.${key}` : key),
    );
  }
  return typeof value === "string" && value.trim() === "" ? [`${locale}.${prefix}`] : [];
}

function getByPath(value, keyPath) {
  return keyPath.split(".").reduce((current, part) => {
    const arrayMatch = part.match(/^(.+)\[(\d+)\]$/);
    if (arrayMatch) return current?.[arrayMatch[1]]?.[Number(arrayMatch[2])];
    return current?.[part];
  }, value);
}

function findEqualLeafValues(left, right) {
  return flattenKeys(left)
    .map((key) => ({ key, value: getByPath(left, key), other: getByPath(right, key) }))
    .filter(({ value, other }) => typeof value === "string" && value === other);
}

function scanHardcodedSpanish() {
  const dirs = ["app", "components", "lib"];
  const extensions = new Set([".ts", ".tsx"]);
  const findings = [];
  const spanishChars = /[\u00c1\u00c9\u00cd\u00d3\u00da\u00e1\u00e9\u00ed\u00f3\u00fa\u00d1\u00f1\u00bf\u00a1]/;
  const ignoredPathParts = [
    `${path.sep}i18n${path.sep}dictionaries${path.sep}`,
    `${path.sep}__tests__${path.sep}`,
  ];
  const ignoredLinePatterns = [/className=/, /^import /, / from "/, /\/\/ @security-waive/];

  for (const dir of dirs) {
    walk(path.join(root, dir), (file) => {
      if (!extensions.has(path.extname(file))) return;
      if (ignoredPathParts.some((part) => file.includes(part))) return;

      const rel = path.relative(root, file);
      const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);

      lines.forEach((line, index) => {
        const text = line.trim();
        if (!spanishChars.test(text)) return;
        if (ignoredLinePatterns.some((pattern) => pattern.test(text))) return;
        findings.push({ file: rel, line: index + 1, text });
      });
    });
  }

  return findings;
}

function walk(dir, visit) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(fullPath, visit);
    else visit(fullPath);
  }
}

function printSection(title, lines) {
  console.log(`\n${title}`);
  console.log("-".repeat(title.length));
  if (!lines.length) {
    console.log("OK");
    return;
  }
  for (const line of lines) console.log(line);
}
