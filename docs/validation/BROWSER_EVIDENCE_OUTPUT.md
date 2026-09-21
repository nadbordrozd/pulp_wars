# Browser smoke evidence output

The v5, v6, and v7 smoke harnesses capture into a unique temporary directory by
default. They print its absolute path before launching Chrome. Captures remain
there after success or failure for inspection; the harness does not delete them
or replace checked-in evidence during a routine validation run.

```bash
npm run smoke:browser
npm run smoke:browser:ruleset6
npm run smoke:browser:legacy-v5
```

For a chosen output directory, use `--output-dir=<new-directory>`. Its parent
must exist; the requested directory must not exist. This also refuses existing
empty directories, files, and symlinks. Relative paths resolve from the repository
root. The equals sign keeps the path distinct from the optional positional URL.

```bash
npm run smoke:browser:legacy-v5 -- --output-dir=/tmp/pulp-wars-v5-review-new
```

Deliberate archive replacement requires `--archive-evidence`, which cannot be
combined with `--output-dir`. Archive mode first checks that the destination tree
has no staged, unstaged, deleted, untracked, or ignored files reported by Git.
Symlink destinations are rejected. It then captures into a unique temporary
directory. Only after the harness passes does it recheck the archive and copy
generated files to their established locations. New destination files are
created exclusively; unrelated files are never deleted. Preserve or commit
existing edits before requesting archive replacement, or use a routine run to
inspect new captures alongside those edits.

```bash
npm run smoke:browser:legacy-v5 -- --archive-evidence
npm run smoke:browser:ruleset6 -- --archive-evidence
npm run smoke:browser -- --archive-evidence
```

| Harness | Archive destination                               |
| ------- | ------------------------------------------------- |
| v5      | `art/integration/reviews/`                        |
| v6      | `art/integration/reviews/ruleset6-browser-smoke/` |
| v7      | `art/integration/reviews/ruleset7-preview/`       |

The v5 resource review's `fruit-production-evidence.json` is captured alongside
screenshots and archives to its historical location at
`art/feedback/reviews/fruit-production-evidence.json`; that destination receives
the same cleanliness checks. V6 evidence manifests keep their canonical archive
paths even when the current run's physical files are in temporary output. The
v6 `--mountain-live` diagnostic uses the isolated output directory and does not
publish archive evidence.

V7 archive mode retains its strict performance acceptance rules described in
[Ruleset 7 release validation](RULESET_7_RELEASE.md). Failed runs leave diagnostic
output in the printed capture directory and never start archive publication.
Copying a successful run into the archive is not a multi-file transaction: a
filesystem error can leave part of that clean archive updated. Captured originals
remain available for recovery, and a retry refuses the now-dirty archive. Do not
edit archive files concurrently with publication. Review the resulting evidence
before committing it; successful capture alone is not visual acceptance.
