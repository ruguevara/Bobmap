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


def clean_bf(bf: str) -> str:
    """Clean a Bayer-Flamsteed designation into a readable label.

    HYG encodes these as e.g. '52Tau Cet', '61    Cyg', 'Eps Ind'.
    - If the string is ONLY a Flamsteed number + constellation (e.g. '52Tau Cet'),
      strip the number: → 'Tau Cet'.
    - If the Flamsteed number IS the identifier (e.g. '61    Cyg'), keep it: → '61 Cyg'.
    - Always collapse internal whitespace.
    """
    import re
    bf = bf.strip()
    # Check if leading digits are followed by a Bayer letter-sequence (Greek abbrev)
    # e.g. '52Tau Cet' — the 'Tau' is a Bayer letter, number is redundant
    # vs '61    Cyg' — no Bayer letter follows, number is the Flamsteed ID
    m = re.match(r'^(\d+)([A-Z][a-z]+\s)', bf)
    if m:
        # Has Bayer letter after the number — strip the number
        bf = bf[len(m.group(1)):]
    # Collapse multiple spaces
    bf = re.sub(r'\s+', ' ', bf).strip()
    return bf


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
            bf_raw = row.get('bf', '').strip()
            bf = clean_bf(bf_raw) if bf_raw else None
            gl = row.get('gl', '').strip() or None
            spect_raw = row.get('spect', '').strip()

            stars.append({
                'id': int(row['id']),
                'hip': hip,
                'name': name,
                'bf': bf,
                'gl': gl,
                'x': x,
                'y': y,
                'z': z,
                'dist_ly': round(dist_ly, 2),
                'mag': mag,
                'spect': spectral_class(spect_raw),
            })

    # Sol is not in HYG (dist=0 is filtered as "unknown"). Inject it as a real
    # record so downstream code treats the Sun like any other system, not a
    # hardcoded corner case in the renderer.
    stars.append({
        'id': 0,
        'hip': None,
        'name': 'Sol',
        'bf': None,
        'gl': None,
        'x': 0.0,
        'y': 0.0,
        'z': 0.0,
        'dist_ly': 0.0,
        'mag': -26.74,
        'spect': 'G',
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
