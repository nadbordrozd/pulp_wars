import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { canonicalJson } from "../src/engine/replay/canonical";

const chrome = process.env.CHROME_PATH;
if (chrome === undefined)
  throw new Error("Set CHROME_PATH to a headless Chrome executable.");

const values = [
  null,
  "",
  // The JSON quotes make each ASCII message two bytes longer.
  ...[53, 54, 61, 62, 117, 118, 4096].map((length) => "x".repeat(length)),
  "a\ud800b\udc00c",
  { "\ue000": "🌍", "\u{10000}": "\ud800", zero: -0 },
];
const vectors = values.map((value) => {
  const json = canonicalJson(value);
  return {
    value,
    json,
    hash: createHash("sha256").update(json, "utf8").digest("hex"),
  };
});
const directory = mkdtempSync(join(tmpdir(), "pulp-wars-canonical-browser-"));
try {
  const bundlePath = join(directory, "canonical.js");
  execFileSync(
    resolve("node_modules/.bin/esbuild"),
    [
      resolve("src/engine/replay/canonical.ts"),
      "--bundle",
      "--platform=browser",
      "--format=iife",
      "--global-name=Canonical",
      `--outfile=${bundlePath}`,
    ],
    { stdio: "pipe", timeout: 15_000 },
  );
  const htmlPath = join(directory, "proof.html");
  writeFileSync(
    htmlPath,
    `<script>${readFileSync(bundlePath, "utf8")}</script><body></body><script>
const vectors = ${JSON.stringify(vectors)};
const failures = vectors.flatMap(({ value, json, hash }, index) => {
  const actualJson = Canonical.canonicalJson(value);
  const actualHash = Canonical.canonicalHash(value);
  return actualJson === json && actualHash === hash ? [] : [{ index, actualJson, actualHash }];
});
document.body.textContent = JSON.stringify({ count: vectors.length, failures });
</script>`,
  );
  const output = execFileSync(
    chrome,
    [
      "--headless",
      "--no-first-run",
      "--disable-gpu",
      `--user-data-dir=${join(directory, "chrome-profile")}`,
      "--virtual-time-budget=5000",
      "--dump-dom",
      `file://${htmlPath}`,
    ],
    { encoding: "utf8", timeout: 20_000, stdio: ["ignore", "pipe", "pipe"] },
  );
  const match = output.match(/<body>(.*?)<\/body>/s);
  if (match === null) throw new Error("Chrome did not return a proof body");
  const result = JSON.parse(match[1] ?? "null") as {
    count: number;
    failures: unknown[];
  };
  if (result.count !== vectors.length || result.failures.length !== 0)
    throw new Error(
      `Browser canonical parity failed: ${JSON.stringify(result)}`,
    );
  process.stdout.write(
    `Chrome canonical JSON/SHA-256 parity passed for ${result.count} exact Node vectors.\n`,
  );
} finally {
  rmSync(directory, { recursive: true, force: true });
}
