# Model and data card

## Intended use and data rights

Independent educational, non-revenue-bearing portfolio study of recommendation ranking. MovieLens latest-small is supplied by GroupLens Research, University of Minnesota, under its own research/noncommercial conditions, including redistribution under the same terms and required acknowledgment. It is not CC0 and is not relicensed by the project's MIT code license. See the unchanged `data/README.txt`.

Credit: F. Maxwell Harper & Joseph A. Konstan (2015), *The MovieLens Datasets: History and Context*, ACM TiiS. DOI 10.1145/2827872. Source: https://grouplens.org/datasets/movielens/latest/. No endorsement is implied.

## Data and scope

Fixed download generated September 26, 2018: 100,836 half-star ratings (0.5–5), 610 anonymous users and 9,742 movie entries. Ratings and movie metadata are used; tags, demographics and external artwork are not. The source is a development dataset that can change and is not appropriate for shared research benchmark results. Original included files and hashes define this local educational diagnostic.

Catalog: top 1,000 movie IDs by count of training positive ratings (≥4), ties by movie ID, then IDs sorted for export. Metadata genres are one-hot encoded, weighted by `log((1+catalog_size)/(1+genre_document_count))+1`, then each item vector is L2 normalized. Genres/IDF depend only on this frozen catalog, not held-out rating labels.

## Split

For each user sort by timestamp, then movie ID for ties. Hold `max(1,floor(n*0.1))` final rows for test and the same count immediately before for validation; remaining rows train. Exact counts are recorded in the evaluation report. Same-timestamp tie order is artificial and is not evidence of real temporal preference ordering.

The split is chronological within a user, but other users' fitting ratings can occur later in calendar time than a target event. It is a known-user offline diagnostic, not a leakage-free global historical replay. The final model uses train+validation; test ratings are excluded from the fitted graph and popularity counts. The catalog remains fixed from training only.

## Candidates and selection

Popularity counts unique users liking each item. Collaborative scoring uses binary likes, item cosine similarity multiplied by `coLikes/(coLikes+10)`, no self edges, and top 40 outgoing positive edges per film. Ties resolve using similarity rounded half-up to twelve decimals then movie ID. The graph is sparse and directional after truncation.

A genre profile sums item TF-IDF vectors for liked history films and normalizes it; dot products score candidates. Audience, genre and popularity scores are independently divided by their query maximum (all-zero signals remain zero). Candidate modes: popularity, genre-only, audience-only and blends with audience weights .25/.50/.75, genre weights .70/.45/.20 and popularity .05.

Validation maximizes mean NDCG@10. The selected mode is blend75. No test result changes this identity or the fixed neighborhood/shrinkage parameters. The browser uses the same train+validation refit as the diagnostic, rather than incorporating test labels.

## Evaluation

Eligible users need at least five fitting-history likes inside the catalog and at least one future positive in it. All previously rated catalog items, including lower ratings, are excluded from candidates. Rank the entire catalog, not sampled negatives. Unknown future/unrated films count as non-hits, without establishing dislike.

NDCG uses binary relevance and log2 discount, normalized to the ideal list for that user's relevant set. Recall is hits divided by catalog-restricted relevant positives; precision divides hits by ten; hit rate is any hit. Means are unweighted across eligible users. Coverage is distinct items in all top-ten lists divided by 1,000.

Final scope: 491/610 users; 4,634 total test positive events, 2,489 in the catalog, 2,473 in eligible-user evaluation. Selected metrics: NDCG .0835985, recall .1096939, precision .0486762, hit .3034623, exposure .182. Paired NDCG difference versus popularity .0208238, with 2,000-resample user-bootstrap 95% interval [.0074884,.0338650]. This interval is exploratory, conditional on the fixed fitting/selection/evaluation setup, and does not measure online lift or population-wide benefit.

## Interactive behavior

The default example taste is clearly labelled. New profiles contain up to twelve favorite films, while offline evaluation uses all eligible users' positive history; the diagnostic does not directly validate these shorter new profiles. Empty taste returns popularity. Item cold start is not evaluated because the catalog is selected using prior likes.

The optional variety control considers the first 100 eligible base-ranked candidates and greedily maximizes `.8*base_score - .2*max_genre_similarity_to_chosen`. It preserves exclusions and filters but is not included in reported base-ranker metrics. Hiding a film excludes it without training a negative preference model. Watchlist saves do not affect ranking.

“Because you liked” shows an actual positive outgoing edge from a selected favorite. Genre overlap is metadata evidence, not a causal explanation of enjoyment. Scores are relative ranking signals, not calibrated probabilities or predicted star ratings. Abstract covers are original code-based designs and have no claim to depict a film's plot.

## Limits

Development-data versioning, popular-title catalog selection, incomplete relevance, per-user calendar mixing, selection on one split, conditioned user bootstrap and short-profile distribution shift. No current availability data, live user study, production validation or measured business uplift is claimed.
