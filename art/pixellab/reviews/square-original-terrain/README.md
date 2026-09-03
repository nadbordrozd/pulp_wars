# Original square terrain family

This directory is rebuilt deterministically with `npm run art:square-original-terrain-review`. It reviews all four Grass, four Forest and three Mountain variants without switching runtime coverage.

The PixelLab provider work is split into coherent Grass 2–4, Forest 2–4 and Mountain 2–3 batches; the checked-in generator refuses mixed families or more than three selected assets. Every Grass source is 256×256 at anchor (128,128). Every Forest and Mountain source is 256×384 at anchor (128,256), with y=128..383 exactly owning the square and only upward overhang allowed.

Grass is deterministically subdued and edge-converged; Forest and Mountain reuse accepted Original square Grass 1. Prompts, negatives, sizes, seeds, style references, provider hashes, output mapping, rejection history and processing are recorded in the PixelLab manifests. Evidence covers native/enlarged inspection, all 11 assets, three 8×8 repetitions, same/different adjacency, min/1x/max zoom, DPR1/2, unchanged Original unit occupancy, ownership, selection, movement targets and fog withholding.
