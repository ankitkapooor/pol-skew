import json
import subprocess
import sys
from pathlib import Path

import pytest

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
from weighted import keyed_step, mid_percentile, percentile_table, weighted_distribution  # noqa: E402

ROOT = HERE.parents[2]


def test_weighted_distribution_hand_computed():
    # codes:   1    1    2    7   99   -9 (missing, dropped)  NaN weight (dropped)
    values = [1, 1, 2, 7, 99, -9, 3]
    weights = [1.0, 3.0, 2.0, 2.0, 2.0, 5.0, float("nan")]
    d = weighted_distribution(values, weights, [1, 2, 3, 4, 5, 6, 7, 99])
    assert d["unweightedN"] == 5
    assert d["weightedN"] == 10.0
    assert d["shares"]["1"] == pytest.approx(0.4)
    assert d["shares"]["2"] == pytest.approx(0.2)
    assert d["shares"]["7"] == pytest.approx(0.2)
    assert d["shares"]["99"] == pytest.approx(0.2)
    assert d["shares"]["3"] == 0.0


def test_percentile_table_hand_computed():
    # Weighted population: value 0 (w=1), 2 (w=2), 2 (w=1), 5 (w=4) → total 8
    t = percentile_table([0, 2, 2, 5], [1, 2, 1, 4], range(0, 6))
    rows = {r["value"]: r for r in t["table"]}
    assert t["weightedN"] == 8
    assert rows[2] == {"value": 2, "below": 1 / 8, "equal": 3 / 8, "above": 4 / 8}
    assert rows[3] == {"value": 3, "below": 4 / 8, "equal": 0.0, "above": 4 / 8}
    # Mid-distribution percentile for a respondent at 2: 1/8 + 3/16 = 0.3125
    assert mid_percentile(rows[2]) == pytest.approx(0.3125)
    assert rows[0]["below"] == 0 and rows[5]["above"] == 0


def test_zero_and_negative_weights_are_dropped():
    t = percentile_table([1, 2, 3], [0, -1, 2], range(0, 4))
    assert t["unweightedN"] == 1


def test_keyed_step_direction_and_scale():
    scale7 = {"options": [{"code": c} for c in range(1, 8)], "direction": -1}
    assert keyed_step(scale7, 7) == 0
    assert keyed_step(scale7, 1) == 6
    assert keyed_step(scale7, 99) is None
    four = {"options": [{"code": c} for c in range(1, 5)], "direction": 1, "stepScale": 2}
    assert [keyed_step(four, c) for c in (1, 2, 3, 4)] == [0, 2, 4, 6]


def test_end_to_end_on_synthetic(tmp_path):
    py = sys.executable
    subprocess.check_call([py, str(HERE.parent / "make_synthetic.py"), str(tmp_path), "--n", "300"])
    out = tmp_path / "norms.json"
    subprocess.check_call(
        [
            py,
            str(HERE.parent / "build_norms.py"),
            "--anes",
            str(tmp_path / "anes_timeseries_2024_csv_20250808.csv"),
            "--ces",
            str(tmp_path / "CCES24_Common_OUTPUT_vv_topost_final.csv"),
            "--out",
            str(out),
            "--synthetic",
        ]
    )
    n = json.loads(out.read_text())
    spec = json.loads((ROOT / "data" / "benchmark-items.json").read_text())
    assert n["synthetic"] is True
    assert set(n["items"]) == {i["id"] for i in spec["items"]}
    for item in n["items"].values():
        assert sum(item["shares"].values()) == pytest.approx(1.0)
    for comp in n["composites"].values():
        rows = comp["table"]
        assert len(rows) == 19
        assert sum(r["equal"] for r in rows) == pytest.approx(1.0)
        for r in rows:
            assert r["below"] + r["equal"] + r["above"] == pytest.approx(1.0)
    assert len(n["sources"]["anes2024"]["sha256"]) == 64
