#!/usr/bin/env python3
"""
Convert HYG database CSV → data/stars.json (filtered to 100 ly radius).

Usage:
    # 1. Download HYG data:
    #    https://github.com/astronexus/HYGDatabase  →  hygdata_v3.csv
    #
    # 2. Run:
    python3 scripts/process_hyg.py hygdata_v3.csv data/stars.json

    # Custom radius (light-years):
    python3 scripts/process_hyg.py hygdata_v3.csv data/stars.json --max-ly 50
"""

import argparse
import csv
import json
import math
import sys

PC_TO_LY = 3.26156


def spectral_class(spect: str) -> str:
    """Return the first letter of the Harvard spectral class, or 'U' if unknown."""
    for ch in spect:
        if ch in 'OBAFGKM':
            return ch
    return 'U'


def process(input_path: str, output_path: str, max_ly: float) -> None:
    stars: list[dict] = []
    skipped = 0

    with open(input_path, newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            try:
                dist_pc = float(row['dist'])
            except (ValueError, KeyError):
                skipped += 1
                continue

            # dist = 100000 means "unknown" in HYG
            if dist_pc <= 0 or dist_pc > 10000:
                skipped += 1
                continue

            dist_ly = dist_pc * PC_TO_LY
            if dist_ly > max_ly:
                continue

            try:
                x = round(float(row['x']), 4)
                y = round(float(row['y']), 4)
                z = round(float(row['z']), 4)
                mag = round(float(row['mag']), 2) if row.get('mag') else 99.0
            except (ValueError, KeyError):
                skipped += 1
                continue

            hip_raw = row.get('hip', '').strip()
            hip = int(hip_raw) if hip_raw else None

            name = row.get('proper', '').strip() or None
            bf = row.get('bf', '').strip() or None
            spect_raw = row.get('spect', '').strip()

            stars.append({
                'id': int(row['id']),
                'hip': hip,
                'name': name,
                'bf': bf,
                'x': x,
                'y': y,
                'z': z,
                'dist_ly': round(dist_ly, 2),
                'mag': mag,
                'spect': spectral_class(spect_raw),
            })

    # Sort by distance from Sol
    stars.sort(key=lambda s: s['dist_ly'])

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(stars, f, indent=2, ensure_ascii=False)

    print(f"Wrote {len(stars)} stars (skipped {skipped} rows) → {output_path}")


def main() -> None:
    parser = argparse.ArgumentParser(description='Convert HYG CSV to stars.json')
    parser.add_argument('input', help='Path to hygdata_v3.csv')
    parser.add_argument('output', nargs='?', default='data/stars.json',
                        help='Output path (default: data/stars.json)')
    parser.add_argument('--max-ly', type=float, default=100.0,
                        help='Maximum distance in light-years (default: 100)')
    args = parser.parse_args()

    process(args.input, args.output, args.max_ly)


if __name__ == '__main__':
    main()
