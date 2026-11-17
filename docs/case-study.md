# Frame: recommendations with visible reasons

## Problem

A film recommender should do more than sort popular titles and call the result personalized. A portfolio demonstration should show the baseline, the candidate exclusions, the evaluation scope and the actual signal behind a suggestion.

Frame combines a cinematic browsing experience with six inspectable rankers. Its poster wall and taste ribbon differ from the other portfolio projects' dashboards and workbenches. Code-generated covers avoid implying ownership of official film artwork or inventing plot descriptions.

## Approach

Use a fixed MovieLens latest-small download (100,836 ratings; 610 users), with full attribution and original source conditions. Split within each user's timestamp order; hold out the last ~10% for test and preceding ~10% for validation. Freeze a 1,000-film catalog using training likes only. This is a known-user offline setup, not a global time replay.

Compare popularity, TF-IDF genre affinity, sparse item-neighbor scoring and three blends. Select on validation NDCG@10. Refit all candidates on train+validation and evaluate full-catalog top-ten lists after excluding all fitting-history rated movies. The default 75/20/5 blend wins validation.

## Findings

Test NDCG@10 is 0.0836 on 491 eligible users, versus approximately 0.0628 for popularity. The paired difference is +0.0208, with an exploratory user-bootstrap interval [0.0075,0.0339]. Test hit@10 is 30.35%, recall@10 10.97%, and catalog exposure 18.2%.

These values are not accuracy, online conversion lift or a claim about all films. Only 2,489/4,634 held-out positive events fall inside the catalog, and 491/610 users qualify. Unknown ratings are non-hits, not known negatives. The development dataset and cross-user calendar mixing limit external interpretation.

## Engineering and product

The exported sparse graph and genre vectors run directly in JavaScript. All 2,946 test-user/model top-ten lists match Python; maximum top-item score discrepancy is 5.55e-16. A dialog exposes real favorite-to-candidate edges; genre-only mode does not claim audience links as an explanation. Empty taste clearly falls back to popularity.

Favorites affect ranking; watchlist saves do not. Hidden titles are excluded. Filters narrow candidates before selection. Optional diversification reduces repeated genre profiles and is explicitly outside the base-ranker diagnostic. Local JSON files preserve taste without a server or account.

## What comes next

A stronger recommender study would use a stable research benchmark, a global-time replay, larger/less popularity-biased catalog, explicit cold-user and cold-item cohorts, and independently designed online evaluation. Broader recommendation coverage and short-profile performance should be measured separately. Frame does not claim those outcomes were established here.
