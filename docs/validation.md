# Validation record

Eight Python checks and eight Node checks pass. All 2,946 top-ten ranking lists across six modes and 491 eligible test users match Python exactly; largest top-item score difference is 5.55e-16.

Other checks cover source hashes, complete/disjoint per-user chronological partitions, training-only catalog selection, sparse neighbor and genre constraints, validation-only model choice, eligibility/seen exclusions, metric and paired-delta reconciliation, no-profile fallback, seed order/duplicate invariance, filter constraints, deterministic diversification, actual explanation edges and taste-file validation.

The source dataset is explicitly treated as a fixed educational development-data diagnostic. Catalog/user restrictions, incomplete relevance and cross-user calendar mixing remain visible in the interface and model/data card. The final browser review and screenshots are recorded in `reports/`.

Desktop smoke checks opened a film explanation, confirmed real neighbor weights, saved a film, searched and added Fargo, selected genre-only ranking with Crime/1990s filters and variety, and confirmed its explanation contained genre evidence rather than unused audience links. Clearing taste produced the labelled popularity fallback. A local taste fixture imported its favorites, saved Matrix entry and exclusion; JSON export prepared successfully. Hiding the first recommendation replaced it with the next ranked film, and bringing hidden films back restored it.

The native film dialog was also checked on a phone. At 390 pixels, discover/evaluation had equal 375-pixel client and scroll widths. A long heading initially overflowed at 320; its responsive size was corrected and both discover/evaluation then had equal 305-pixel widths. Wide metric tables retain their own horizontal scroll. The final phone screenshot was captured only after confirming a 390-pixel viewport. No browser warnings or errors were observed. These are smoke checks, not exhaustive device certification.
