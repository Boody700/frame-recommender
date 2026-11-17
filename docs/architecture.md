# Architecture

`download.py` → verified source ZIP or provided archive → ratings / movies / original source terms / SHA-256 manifest

`train.py` → per-user split → training-only catalog → six fixed rankers → validation selection → train+validation refits → full-catalog test rankings → paired user bootstrap → browser assets and parity fixtures

`recommender.mjs` → portable deterministic score/rank functions, optional genre diversification, real-edge explanations and whitelisted taste imports

`app.mjs` → local catalog search, example/personal taste ribbon, poster wall, detail dialog, exclusions, watchlist and file controls

## Portability contract

The model JSON contains sorted movie IDs, normalized genre vectors, positive-user counts and at most 40 weighted outgoing edges per seed. No raw user profile is shipped to the browser. The app sums edges in sorted unique seed order. Final ranks use twelve-decimal half-up score rounding and movie-ID ties, matching Python. Tests compare all six modes × 491 eligible test users (2,946 top-ten lists) and top-item scores.

The static app performs no training or inference-network requests. JSON data and optional Google Fonts load from their hosts; taste, searches, watchlist and local files remain in session memory. Refresh clears state. The local Node server confines paths to `dist/`, supplies correct module MIME types and listens only on 127.0.0.1:4178.

## Reproduction

NumPy/pandas versions are pinned; actual versions and source hashes are in the report. The original CSVs and redistribution terms are included. The downloader's optional `--archive` permits a verified system download if a Python trust store cannot validate the source's certificate chain; certificate verification must not be disabled. Source ZIPs, caches and environments are omitted.

No npm dependency installation is necessary. Node tests exercise full parity, exclusions, no-profile fallback, seed invariance, diversity constraints, faithful edges, import bounds and metric reconciliation. Python checks cover data hashes, disjoint/order-preserving splits, training-only catalog construction, graph/genre constraints, selection and score reconciliation. CI is supplied for future use.

## Deployment and next work

The same static assets are packaged by Sites and deployed owner-private. The source ZIP includes code, data terms, prebuilt assets, tests and reports without repository credentials. The public repository includes the same prebuilt assets for local preview.

Before production, replace the development dataset, test global-time scenarios and cold cohorts, validate exposure/long-tail goals, and separate online user outcomes from sparse offline relevance. A new independent holdout is required for substantial further tuning claims.
