# Square terrain sample gate

This directory is rebuilt deterministically with `npm run art:square-terrain-sample-review`. It records the individual acceptance gate for exactly three new production assets: Original Grass 1, Forest 1, and Mountain 1. Diamond-era art remains untouched and runtime terrain coverage is not switched by this bead.

Grass uses a 256×256 source at anchor (128,128). Forest and Mountain use untrimmed 256×384 sources at anchor (128,256), with source y=128..383 mapping exactly to the 128×128 owning cell and only upward overhang allowed. PixelLab prompts, seeds, provider hashes, rejection history, output hashes, and deterministic processing are recorded in the two checked-in manifests.

The shared light comes from upper-left/northwest, with darker southeast planes. Grass required seven rejected iterations: the seventh passed source-scale checks but was superseded after its diagonal bands and scratch cluster stamped conspicuously across the 8×8 minimum-zoom review. The final recipe radius-24 blurs fresh PixelLab material, retains 4% of its color over the canonical field, and converges the outer 48 pixels for a quiet seam-safe result. Forest passed its first request; Mountain required three rejected diamond-base iterations before its authored peak was feathered into a full square slate field.
