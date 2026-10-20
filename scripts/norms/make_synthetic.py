"""Generate synthetic ANES/CES-shaped CSVs for tests and the dev-only norms fixture.

The values are random draws, not survey data. Usage:
    python scripts/norms/make_synthetic.py OUT_DIR [--n 2000] [--seed 1]
"""

from __future__ import annotations

import argparse
import json
import random
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("out", type=Path)
    p.add_argument("--n", type=int, default=2000)
    p.add_argument("--seed", type=int, default=1)
    a = p.parse_args()
    spec = json.loads((ROOT / "data" / "benchmark-items.json").read_text())
    rng = random.Random(a.seed)
    a.out.mkdir(parents=True, exist_ok=True)
    for key, src in spec["sources"].items():
        items = [i for i in spec["items"] if i["source"] == key]
        cols = [src["idVariable"], src["weight"], *[i["variable"] for i in items]]
        lines = [",".join(cols)]
        for r in range(a.n):
            lean = rng.gauss(0, 1)  # one latent dimension so composites look plausible
            row = [str(r + 1), f"{rng.uniform(0.2, 3):.4f}" if rng.random() > 0.02 else "-1"]
            for it in items:
                codes = [o["code"] for o in it["options"]]
                if rng.random() < 0.05:
                    row.append(str(rng.choice(it["missingCodes"] + [o["code"] for o in it["offeredNonSubstantive"]])))
                    continue
                pos = (lean * it["direction"] + rng.gauss(0, 1)) / 3 + 0.5
                idx = min(len(codes) - 1, max(0, int(pos * len(codes))))
                row.append(str(sorted(codes)[idx]))
            lines.append(",".join(row))
        (a.out / Path(src["expectedFile"]).name).write_text("\n".join(lines) + "\n")
    print(f"Wrote synthetic files to {a.out}")


if __name__ == "__main__":
    main()
