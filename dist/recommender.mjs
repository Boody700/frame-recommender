export const MODES = ["popular", "content", "collab", "blend25", "blend50", "blend75"];
const normalize = (values) => {
  const max = Math.max(0, ...values);
  return max ? values.map((v) => v / max) : values.map(() => 0);
};
export function score(model, seedIndices, mode) {
  if (!MODES.includes(mode)) throw new RangeError("Unknown ranking mode.");
  const n = model.ids.length, seeds = [...new Set(seedIndices)].sort((a, b) => a - b);
  if (seeds.some((i) => !Number.isInteger(i) || i < 0 || i >= n)) throw new RangeError("Unknown favorite.");
  const pop = normalize(model.popularity);
  if (!seeds.length) return pop;
  const raw = Array(n).fill(0);
  for (const i of seeds) for (const [j, value] of model.neighbors[i]) raw[j] += value;
  const audience = normalize(raw), profile = Array(model.genres[0].length).fill(0);
  for (const i of seeds) model.genres[i].forEach((v, j) => profile[j] += v);
  const norm = Math.sqrt(profile.reduce((s, v) => s + v * v, 0));
  const content = normalize(model.genres.map((row) => norm ? row.reduce((s, v, j) => s + v * profile[j] / norm, 0) : 0));
  if (mode === "popular") return pop;
  if (mode === "content") return content;
  if (mode === "collab") return audience;
  const alpha = { blend25: 0.25, blend50: 0.5, blend75: 0.75 }[mode];
  return audience.map((v, i) => alpha * v + (0.95 - alpha) * content[i] + 0.05 * pop[i]);
}
export function rank(model, seeds, seen, mode, { limit = 12, allowed = null, variety = false } = {}) {
  const values = score(model, seeds, mode), exclude = new Set(seen), round = (v) => Math.floor(v * 1e12 + 0.5) / 1e12;
  let candidates = Array.from({ length: values.length }, (_, i) => i).filter((i) => !exclude.has(i) && (!allowed || allowed.has(i)));
  candidates.sort((a, b) => round(values[b]) - round(values[a]) || model.ids[a] - model.ids[b]);
  if (!variety) return { indices: candidates.slice(0, limit), scores: values };
  const pool = candidates.slice(0, 100), selected = [];
  while (pool.length && selected.length < limit) {
    let best = 0, bestValue = -Infinity;
    for (let p = 0; p < pool.length; p++) {
      const i = pool[p], similarity = selected.length ? Math.max(...selected.map((j) => model.genres[i].reduce((s, v, k) => s + v * model.genres[j][k], 0))) : 0;
      const value = 0.8 * values[i] - 0.2 * similarity;
      if (value > bestValue + 1e-12) {
        best = p;
        bestValue = value;
      }
    }
    selected.push(pool.splice(best, 1)[0]);
  }
  return { indices: selected, scores: values };
}
export function contributions(model, seeds, target) {
  return [...new Set(seeds)].map((i) => ({ index: i, weight: model.neighbors[i].find(([j]) => j === target)?.[1] || 0 })).filter((x) => x.weight > 0).sort((a, b) => b.weight - a.weight || model.ids[a.index] - model.ids[b.index]);
}
export function validateTaste(input, knownIds) {
  if (!input || input.schema !== "frame-taste-v1") throw new RangeError("Choose a Frame taste file.");
  const valid = new Set(knownIds), fields = ["favorites", "saved", "dismissed"];
  for (const key of fields) {
    if (!Array.isArray(input[key]) || input[key].length > (key === "favorites" ? 12 : 1e3) || input[key].some((id) => !Number.isInteger(id) || !valid.has(id))) throw new RangeError("Invalid " + key + ".");
  }
  if (!MODES.includes(input.mode)) throw new RangeError("Invalid ranking mode.");
  return { favorites: [...new Set(input.favorites)], saved: [...new Set(input.saved)], dismissed: [...new Set(input.dismissed)], mode: input.mode };
}
