"""
SIH26264 - Synthetic Complaint Data Generator CLI
Prepares synthetic institution-related complaints across AICTE bureaus.

Usage:
    python generate_synthetic_data.py --count 100 --output data/synthetic_complaints.json
"""

import argparse
import sys
from pathlib import Path


def parse_arguments():
    parser = argparse.ArgumentParser(
        description="Generate synthetic complaints for SIH26264 AICTE Complaint Intelligence system."
    )
    parser.add_argument(
        "--count",
        type=int,
        default=100,
        help="Number of synthetic complaint records to generate (default: 100).",
    )
    parser.add_argument(
        "--output",
        type=str,
        default="data/synthetic_complaints.json",
        help="Target output filepath (JSON or CSV).",
    )
    parser.add_argument(
        "--include-duplicates",
        action="store_true",
        help="Inject intentional cross-bureau duplicates and paraphrased complaints for overlap testing.",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=42,
        help="Random seed for reproducible dataset generation.",
    )
    return parser.parse_args()


def main():
    args = parse_arguments()
    print("=" * 70)
    print("SIH26264 Complaint Intelligence - Synthetic Data Generator")
    print("=" * 70)
    print(f"Target count: {args.count}")
    print(f"Output path:  {args.output}")
    print(f"Duplicates:   {args.include_duplicates}")
    print(f"Random seed:  {args.seed}")
    print("-" * 70)
    print(
        "[STUB] Structure initialized. Implementation will be developed in Phase 2 "
        "as per project roadmap."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
