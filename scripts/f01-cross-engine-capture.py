#!/usr/bin/env python3
"""Generate diagnostic comparison inputs using pinned JyotiPy/PyMeeus.

JyotiPy computes astronomical angles with PyMeeus, but its Sripati geometry
was explicitly ported from Swiss Ephemeris. This IS NOT an independently
derived Sripati house-system reference and cannot be admitted into F01-P0-03.
"""
import argparse
import importlib.metadata
import json
import math
from datetime import datetime, timezone

from jyotipy import BirthChart

CASES = (
    ("j2000_delhi", "2000-01-01T12:00:00Z", 28.6139, 77.2090),
    ("kolkata_1989", "1989-11-22T23:00:00Z", 22.5726, 88.3639),
    ("sydney_2000", "2000-01-01T12:00:00Z", -33.8688, 151.2093),
    ("london_1970", "1970-05-05T02:00:00Z", 51.5074, -0.1278),
    ("new_york_2024", "2024-11-03T05:00:00Z", 40.7128, -74.006),
    ("equator_2001", "2001-03-20T12:00:00Z", 0.0, 0.0),
    ("northern_2020", "2020-03-20T12:00:00Z", 58.0, 10.0),
    ("southern_2020", "2020-03-20T12:00:00Z", -55.0, -67.0),
)

def build():
    jyotipy_version = importlib.metadata.version("jyotipy")
    pymeeus_version = importlib.metadata.version("PyMeeus")
    if (jyotipy_version, pymeeus_version) != ("0.2.1", "0.5.12"):
        raise SystemExit("F01_EXTERNAL_ENGINE_VERSION_NOT_PINNED")
    cases = []
    for name, utc, latitude, longitude in CASES:
        instant = datetime.fromisoformat(utc.replace("Z", "+00:00"))
        dt = instant.astimezone(timezone.utc).replace(tzinfo=None)
        chart = BirthChart(dt, utc_offset_hours=0.0, latitude=latitude, longitude=longitude)
        cusps = chart.houses("sripati")
        if len(cusps) != 12 or any(not math.isfinite(v) or not (0 <= v < 360) for v in cusps):
            raise SystemExit("F01_EXTERNAL_CUSPS_INVALID")
        cases.append({
            "id": name, "utc": utc, "latitude": latitude, "longitude": longitude,
            "sidereal_ascendant_deg": chart.ascendant,
            "sidereal_mc_deg": chart.midheaven,
            "sidereal_sripati_cusps_deg": [float(x) for x in cusps],
        })
    return {
        "schema_version": 1,
        "diagnostic_mode": "CROSS_ENGINE_NOT_INDEPENDENT_SRIPATI_FORMULA",
        "astronomical_provider": "PYMEEUS_VSOP87_MEEUS",
        "house_formula_origin": "JYOTIPY_SRIPATI_TRANSCRIBED_FROM_SWISS_SOURCE",
        "source_package": {"name": "jyotipy", "version": jyotipy_version},
        "time_base_package": {"name": "PyMeeus", "version": pymeeus_version},
        "cases": cases,
        "customer_timing_authorized": False,
        "scientific_acceptance": "NOT_ESTABLISHED",
    }

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    result = build()
    with open(args.output, "w", encoding="utf-8") as out:
        json.dump(result, out, indent=2, sort_keys=True, allow_nan=False)
        out.write("\n")
    print(f"F01 diagnostic capture: {len(result['cases'])} real cross-engine calculations; not independent Sripati formula validation")

if __name__ == "__main__":
    main()
