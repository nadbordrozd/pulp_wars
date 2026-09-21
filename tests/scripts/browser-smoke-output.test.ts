import { execFileSync } from "node:child_process";
import {
  mkdtemp,
  mkdir,
  readFile,
  realpath,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { prepareSmokeOutput } from "../../scripts/browser-smoke-output";

const cleanup: string[] = [];
afterEach(async () => {
  await Promise.all(
    cleanup
      .splice(0)
      .map((target) => rm(target, { recursive: true, force: true })),
  );
});

async function fixture() {
  const root = await realpath(
    await mkdtemp(path.join(tmpdir(), "smoke-output-test-")),
  );
  cleanup.push(root);
  const git = (...args: string[]) =>
    execFileSync("git", args, { cwd: root, encoding: "utf8" });
  git("init", "--quiet");
  await mkdir(path.join(root, "reviews"));
  await writeFile(
    path.join(root, "reviews", "existing.png"),
    "committed pixels",
  );
  await writeFile(path.join(root, ".gitignore"), "*.ignored\n");
  git("add", ".");
  git(
    "-c",
    "user.name=Output test",
    "-c",
    "user.email=output@example.invalid",
    "-c",
    "commit.gpgsign=false",
    "commit",
    "--quiet",
    "-m",
    "fixture",
  );
  return {
    root,
    git,
    file: (name: string) => path.join(root, "reviews", name),
    async output(args: string[] = []) {
      const result = await prepareSmokeOutput({
        args,
        name: "test",
        archiveDirectory: "reviews",
        repositoryRoot: root,
      });
      if (!result.directory.startsWith(`${root}${path.sep}`))
        cleanup.push(result.directory);
      return result;
    },
  };
}

describe("browser smoke evidence output", () => {
  it.each([
    ["scripts/browser-smoke.ts", "art/integration/reviews"],
    [
      "scripts/browser-smoke-v6.ts",
      "art/integration/reviews/ruleset6-browser-smoke",
    ],
    ["scripts/browser-smoke-v7.ts", "art/integration/reviews/ruleset7-preview"],
  ])(
    "%s refuses a dirty archive before starting Chrome",
    async (script, archive) => {
      const f = await fixture();
      await mkdir(path.join(f.root, archive), { recursive: true });
      const evidence = path.join(f.root, archive, "existing.png");
      await writeFile(evidence, "user capture");
      expect(() =>
        execFileSync(
          process.execPath,
          [
            path.resolve("node_modules/tsx/dist/cli.mjs"),
            path.resolve(script),
            "--archive-evidence",
          ],
          {
            cwd: f.root,
            env: {
              ...process.env,
              CHROME_PATH: path.join(f.root, "must-not-launch"),
            },
            stdio: "pipe",
            timeout: 15_000,
          },
        ),
      ).toThrow("Refusing to overwrite dirty or untracked evidence");
      expect(await readFile(evidence, "utf8")).toBe("user capture");
    },
  );

  it("isolates repeated routine runs from dirty tracked, untracked, and ignored evidence", async () => {
    const f = await fixture();
    await writeFile(f.file("existing.png"), "user edit");
    await writeFile(f.file("new.png"), "user untracked");
    await writeFile(f.file("private.ignored"), "user ignored");
    const before = f.git("status", "--porcelain", "--ignored");
    const first = await f.output();
    const second = await f.output();
    expect(first.directory).not.toBe(second.directory);
    for (const name of ["existing.png", "new.png", "private.ignored"]) {
      await writeFile(path.join(first.directory, name), "new capture");
    }
    await first.publish();
    expect(await readFile(f.file("existing.png"), "utf8")).toBe("user edit");
    expect(await readFile(f.file("new.png"), "utf8")).toBe("user untracked");
    expect(await readFile(f.file("private.ignored"), "utf8")).toBe(
      "user ignored",
    );
    expect(f.git("status", "--porcelain", "--ignored")).toBe(before);
  });

  it.each(["unstaged", "staged", "deleted", "untracked", "ignored"])(
    "refuses archival over %s evidence before capture",
    async (kind) => {
      const f = await fixture();
      if (kind === "deleted") await rm(f.file("existing.png"));
      else
        await writeFile(
          f.file(
            kind === "untracked"
              ? "new.png"
              : kind === "ignored"
                ? "private.ignored"
                : "existing.png",
          ),
          "preserve me",
        );
      if (kind === "staged") f.git("add", ".");
      const before = f.git("status", "--porcelain", "--ignored");
      await expect(f.output(["--archive-evidence"])).rejects.toThrow(
        "Refusing to overwrite",
      );
      expect(f.git("status", "--porcelain", "--ignored")).toBe(before);
    },
  );

  it("publishes clean intentional evidence without removing other files", async () => {
    const f = await fixture();
    const output = await f.output(["--archive-evidence"]);
    await writeFile(path.join(output.directory, "new.png"), "new pixels");
    await writeFile(
      path.join(output.directory, "existing.png"),
      "replacement pixels",
    );
    expect(await readFile(f.file("existing.png"), "utf8")).toBe(
      "committed pixels",
    );
    await output.publish();
    expect(await readFile(f.file("existing.png"), "utf8")).toBe(
      "replacement pixels",
    );
    expect(await readFile(f.file("new.png"), "utf8")).toBe("new pixels");
    expect(
      await readFile(path.join(output.directory, "existing.png"), "utf8"),
    ).toBe("replacement pixels");
  });

  it("retains failed-run captures and never publishes without successful completion", async () => {
    const f = await fixture();
    const output = await f.output(["--archive-evidence"]);
    await expect(
      (async () => {
        await writeFile(
          path.join(output.directory, "existing.png"),
          "partial capture",
        );
        throw new Error("browser failed");
      })(),
    ).rejects.toThrow("browser failed");
    expect(await readFile(f.file("existing.png"), "utf8")).toBe(
      "committed pixels",
    );
    expect(
      await readFile(path.join(output.directory, "existing.png"), "utf8"),
    ).toBe("partial capture");
  });

  it("rechecks changes made during capture before any archive writes", async () => {
    const f = await fixture();
    const output = await f.output(["--archive-evidence"]);
    await writeFile(path.join(output.directory, "existing.png"), "replacement");
    await writeFile(path.join(output.directory, "a-new.png"), "replacement");
    await writeFile(f.file("existing.png"), "late user edit");
    await expect(output.publish()).rejects.toThrow("Refusing to overwrite");
    expect(await readFile(f.file("existing.png"), "utf8")).toBe(
      "late user edit",
    );
    await expect(readFile(f.file("a-new.png"))).rejects.toMatchObject({
      code: "ENOENT",
    });
  });

  it("uses a requested new directory and refuses existing directories or conflicting options", async () => {
    const f = await fixture();
    const output = await f.output(["--output-dir=chosen"]);
    expect(output.directory).toBe(path.join(f.root, "chosen"));
    await writeFile(
      path.join(output.directory, "existing.png"),
      "explicit capture",
    );
    await output.publish();
    await expect(f.output(["--output-dir=chosen"])).rejects.toMatchObject({
      code: "EEXIST",
    });
    await expect(f.output(["--output-dir=reviews"])).rejects.toMatchObject({
      code: "EEXIST",
    });
    for (const args of [
      ["--output-dir="],
      ["--output-dir", "chosen"],
      ["--output-dir=new", "--archive-evidence"],
      ["--output-dir=a", "--output-dir=b"],
    ]) {
      await expect(f.output(args)).rejects.toThrow("Use either");
    }
    expect(await readFile(f.file("existing.png"), "utf8")).toBe(
      "committed pixels",
    );
  });

  it("preserves exceptional historical archive locations and guards them too", async () => {
    const f = await fixture();
    await writeFile(path.join(f.root, "feedback.json"), "old feedback");
    f.git("add", ".");
    f.git(
      "-c",
      "user.name=Output test",
      "-c",
      "user.email=output@example.invalid",
      "-c",
      "commit.gpgsign=false",
      "commit",
      "--quiet",
      "-m",
      "feedback",
    );
    const prepare = () =>
      prepareSmokeOutput({
        args: ["--archive-evidence"],
        name: "test",
        archiveDirectory: "reviews",
        archiveFiles: { "feedback.json": "feedback.json" },
        repositoryRoot: f.root,
      });
    const output = await prepare();
    cleanup.push(output.directory);
    await writeFile(
      path.join(output.directory, "feedback.json"),
      "new feedback",
    );
    await output.publish();
    expect(await readFile(path.join(f.root, "feedback.json"), "utf8")).toBe(
      "new feedback",
    );
    await expect(readFile(f.file("feedback.json"))).rejects.toMatchObject({
      code: "ENOENT",
    });
    await expect(prepare()).rejects.toThrow("Refusing to overwrite");
  });

  it("fails closed on symlink artifacts and archives, retaining existing bytes", async () => {
    const f = await fixture();
    const output = await f.output(["--archive-evidence"]);
    await symlink(
      f.file("existing.png"),
      path.join(output.directory, "link.png"),
    );
    await expect(output.publish()).rejects.toThrow("not a regular file");
    await symlink(path.join(f.root, "reviews"), path.join(f.root, "linked"));
    await expect(
      prepareSmokeOutput({
        args: ["--archive-evidence"],
        name: "test",
        archiveDirectory: "linked",
        repositoryRoot: f.root,
      }),
    ).rejects.toThrow("symlink");
    await expect(f.output(["--output-dir=linked"])).rejects.toMatchObject({
      code: "EEXIST",
    });
    expect(await readFile(f.file("existing.png"), "utf8")).toBe(
      "committed pixels",
    );
  });
});
