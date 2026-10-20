"""Pure helpers for weighted distributions and percentile tables. No I/O."""

from __future__ import annotations

from collections.abc import Iterable, Mapping, Sequence

import math


def _clean(values: Sequence[float | None], weights: Sequence[float | None]) -> list[tuple[float, float]]:
    """Pairs (value, weight) with both present, finite, and weight > 0."""
    out = []
    for v, w in zip(values, weights, strict=True):
        if v is None or w is None:
            continue
        if isinstance(v, float) and math.isnan(v):
            continue
        if isinstance(w, float) and math.isnan(w):
            continue
        if w <= 0:
            continue
        out.append((v, float(w)))
    return out


def weighted_distribution(
    values: Sequence[float | None], weights: Sequence[float | None], codes: Iterable[int]
) -> dict:
    """Weighted share of each code among valid responses (values outside `codes` are dropped)."""
    allowed = set(codes)
    pairs = [(int(v), w) for v, w in _clean(values, weights) if int(v) == v and int(v) in allowed]
    total = sum(w for _, w in pairs)
    shares = {c: 0.0 for c in sorted(allowed)}
    for v, w in pairs:
        shares[v] += w
    return {
        "unweightedN": len(pairs),
        "weightedN": total,
        "shares": {str(c): (s / total if total else None) for c, s in shares.items()},
    }


def percentile_table(values: Sequence[float | None], weights: Sequence[float | None], support: Iterable[int]) -> dict:
    """For each value in `support`: weighted share of the population below, equal to and above it."""
    pairs = _clean(values, weights)
    total = sum(w for _, w in pairs)
    rows = []
    for x in support:
        below = sum(w for v, w in pairs if v < x)
        equal = sum(w for v, w in pairs if v == x)
        rows.append(
            {
                "value": x,
                "below": below / total if total else None,
                "equal": equal / total if total else None,
                "above": (total - below - equal) / total if total else None,
            }
        )
    return {"unweightedN": len(pairs), "weightedN": total, "table": rows}


def mid_percentile(row: Mapping[str, float]) -> float:
    """Mid-distribution percentile: P(Y < y) + ½ P(Y = y). Mirrors src/benchmark/score.ts."""
    return row["below"] + row["equal"] / 2


def keyed_step(item: Mapping, code: int | None) -> int | None:
    """Integer step 0..6 toward the + pole for a substantive code, else None. Mirrors keyedStep() in TS."""
    if code is None:
        return None
    codes = [o["code"] for o in item["options"]]
    if code not in codes:
        return None
    lo, hi = min(codes), max(codes)
    raw = code - lo if item["direction"] > 0 else hi - code
    return raw * int(item.get("stepScale", 1))
