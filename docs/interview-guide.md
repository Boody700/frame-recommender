# Be ready to explain Frame

## A concise introduction

“I built a local film recommendation app with a real sparse item-neighbor model, genre profiles and popularity baselines. Six fixed modes compete on validation NDCG, then a frozen choice is evaluated on full-catalog top-ten rankings. I expose actual reasons and all evaluation exclusions. The 75/20/5 blend improves the local NDCG diagnostic by .0208 over popularity, but I do not call that online lift or general accuracy.”

## Questions

**How is it personalized?** Positive history films contribute item-neighbor edges and genre-profile features. The popularity-only mode is explicitly not personalized. Empty taste also returns popularity. Saving a watchlist item does not silently turn it into a favorite.

**Why use a baseline?** Popularity is strong and cheap. A more complex blend must justify itself under the same candidate set, user eligibility and exclusions. Model selection used validation NDCG, not a preferred-looking test result.

**What does NDCG .0836 mean?** Discounted gain relative to the ideal binary-relevance ordering, averaged over eligible users. It is not 8.36% accuracy. Sparse observed ratings leave many candidates unjudged; counting those as non-hits is an evaluation convention, not evidence of dislike.

**Is the split leakage-free?** It separates each user's history from later held-out rows, including deterministic movie-ID tie handling. It is not a global time replay: other users can contribute later-calendar ratings. That limitation is stated prominently. A true temporal recommender deployment study would require a global cutoff or replay protocol.

**Why are only 491 users evaluated?** They have at least five fitting-history likes and a held-out positive inside the catalog. Others lack eligible targets/history. Only 2,489/4,634 test positives are catalog items. Dropping these cases changes the claim; it must remain visible.

**How do you prevent seen-film recommendations?** Offline evaluation excludes every fitting-history rated film, not only liked ones. The app excludes favorites and hidden films. Those sets are applied before selection/diversification and covered by tests.

**Are explanations faithful?** An audience reason names an actual positive edge contributing from a favorite. Genre-only mode shows genre evidence rather than claiming unused audience contributions. These are scoring connections, not causal reasons the viewer will enjoy a film.

**What is cold start here?** A user with no favorites gets popularity. Genre affinity supports sparse profiles. The project does not evaluate real item cold start because its catalog was selected by training likes.

**Does the diversity checkbox improve the benchmark?** No such result is claimed. It optionally reranks to reduce genre repetition using a fixed .8 relevance / .2 redundancy tradeoff over the top 100 eligible candidates. Offline scores describe the base rankers only.

**Can the data be used commercially?** Not under an assumed open-data license. The original GroupLens conditions allow research and redistribution under the same terms; commercial/revenue-bearing use requires separate permission. The code's MIT license does not relicense the dataset.

## Demo sequence

Replace the example taste; compare audience and popularity modes; filter a genre; inspect a real explanation; save a watchlist item; hide and restore a film; clear taste to demonstrate fallback; export/import JSON. Open The algorithm and explain eligibility, catalog coverage and why the paired bootstrap is not online lift. Be able to reproduce the scoring code yourself.
