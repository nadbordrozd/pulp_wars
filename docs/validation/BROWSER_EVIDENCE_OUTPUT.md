# Browser smoke evidence output

The Ruleset 7 smoke harness captures into a unique temporary directory by
default. It prints the absolute path before launching Chrome. Captures remain
there after success or failure for inspection; the harness does not delete them
or replace checked-in evidence during a routine validation run. (The harnesses
of the retired prototypes, `smoke:browser:ruleset6` and
`smoke:browser:legacy-v5`, were removed with `pulp_wars-lky5`, with their
archives under `art/integration/reviews/`.)

```bash
npm run smoke:browser
```

For a chosen output directory, use `--output-dir=<new-directory>`. Its parent
must exist; the requested directory must not exist. This also refuses existing
empty directories, files, and symlinks. Relative paths resolve from the repository
root. The equals sign keeps the path distinct from the optional positional URL.

```bash
npm run smoke:browser -- --output-dir=/tmp/pulp-wars-v7-review-new
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
npm run smoke:browser -- --archive-evidence
```

| Harness | Archive destination                         |
| ------- | ------------------------------------------- |
| v7      | `art/integration/reviews/ruleset7-preview/` |

The archive holds the frozen revision-2 evidence; replacing it is not a
current release step
([Ruleset 7 release validation](RULESET_7_RELEASE.md)). Archive mode retains
the strict performance acceptance rules described there. Failed runs leave
diagnostic output in the printed capture directory and never start archive
publication. Copying a successful run into the archive is not a multi-file
transaction: a filesystem error can leave part of that clean archive updated.
Captured originals remain available for recovery, and a retry refuses the
now-dirty archive. Do not edit archive files concurrently with publication.
Review the resulting evidence before committing it; successful capture alone is
not visual acceptance.
