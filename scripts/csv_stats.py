#!/usr/bin/env python3
"""CSV summary statistics — quick descriptive stats for any trade CSV file."""

import argparse
import sys
from pathlib import Path

import numpy as np
import pandas as pd


def detect_numeric_cols(df: pd.DataFrame) -> list[str]:
    return df.select_dtypes(include=[np.number]).columns.tolist()


def detect_datetime_cols(df: pd.DataFrame) -> list[str]:
    dt_cols = df.select_dtypes(include=["datetime", "datetimetz"]).columns.tolist()
    if not dt_cols:
        for col in df.columns:
            if pd.api.types.is_string_dtype(df[col]):
                sample = df[col].dropna().head(20)
                try:
                    pd.to_datetime(sample)
                    df[col] = pd.to_datetime(df[col], errors="coerce")
                    dt_cols.append(col)
                except (ValueError, TypeError):
                    pass
    return dt_cols


def section(title: str, width: int = 60) -> str:
    return f"\n{'─' * width}\n  {title}\n{'─' * width}"


def format_number(val, decimals: int = 4) -> str:
    if pd.isna(val):
        return "N/A"
    if isinstance(val, float):
        if abs(val) >= 1_000_000:
            return f"{val:,.2f}"
        return f"{val:.{decimals}f}"
    return str(val)


def print_shape(df: pd.DataFrame, dt_cols: list[str]) -> None:
    print(section("OVERVIEW"))
    print(f"  Rows:             {len(df):,}")
    print(f"  Columns:          {len(df.columns)}")
    mem = df.memory_usage(deep=True).sum()
    print(f"  Memory usage:     {mem / 1024:.1f} KB")
    print(f"  Duplicate rows:   {df.duplicated().sum():,}")

    if dt_cols:
        ts_col = dt_cols[0]
        series = df[ts_col].dropna().sort_values()
        if len(series) > 1:
            span_hours = (series.max() - series.min()).total_seconds() / 3600
            if span_hours > 0:
                hourly_counts = series.dt.floor("h").value_counts().sort_index()
                if len(hourly_counts) > 1:
                    print(section("TRADE FREQUENCY (per hour)"))
                    print(f"    {'(based on column:':<22} '{ts_col}', span = {span_hours:,.1f} hours)")
                    print(f"    {'Overall avg:':<22} {len(series) / span_hours:,.2f}")
                    print(f"    {'Mean:':<22} {hourly_counts.mean():,.2f}")
                    print(f"    {'Std Dev:':<22} {hourly_counts.std():,.2f}")
                    print(f"    {'Min:':<22} {hourly_counts.min():,}")
                    print(f"    {'25th Percentile:':<22} {hourly_counts.quantile(0.25):,.1f}")
                    print(f"    {'Median:':<22} {hourly_counts.quantile(0.50):,.1f}")
                    print(f"    {'75th Percentile:':<22} {hourly_counts.quantile(0.75):,.1f}")
                    print(f"    {'90th Percentile:':<22} {hourly_counts.quantile(0.90):,.1f}")
                    print(f"    {'95th Percentile:':<22} {hourly_counts.quantile(0.95):,.1f}")
                    print(f"    {'99th Percentile:':<22} {hourly_counts.quantile(0.99):,.1f}")
                    print(f"    {'Max:':<22} {hourly_counts.max():,}")
                    cv = hourly_counts.std() / hourly_counts.mean() if hourly_counts.mean() > 0 else float("nan")
                    print(f"    {'Coeff of Variation:':<22} {cv:.4f}")
                    print(f"    {'# Active hours:':<22} {len(hourly_counts):,}")


def print_column_types(df: pd.DataFrame) -> None:
    print(section("COLUMN TYPES"))
    for col in df.columns:
        nulls = df[col].isna().sum()
        null_pct = nulls / len(df) * 100
        null_str = f"  ({nulls:,} nulls, {null_pct:.1f}%)" if nulls else ""
        print(f"  {col:<30} {str(df[col].dtype):<15}{null_str}")


def print_numeric_stats(df: pd.DataFrame, num_cols: list[str]) -> None:
    if not num_cols:
        return

    print(section("NUMERIC COLUMN STATISTICS"))

    for col in num_cols:
        series = df[col].dropna()
        if series.empty:
            continue

        print(f"\n  ▸ {col}")
        print(f"    {'Count:':<22} {len(series):,}")
        print(f"    {'Mean:':<22} {format_number(series.mean())}")
        print(f"    {'Std Dev:':<22} {format_number(series.std())}")
        print(f"    {'Min:':<22} {format_number(series.min())}")
        print(f"    {'25th Percentile:':<22} {format_number(series.quantile(0.25))}")
        print(f"    {'Median (50th):':<22} {format_number(series.quantile(0.50))}")
        print(f"    {'75th Percentile:':<22} {format_number(series.quantile(0.75))}")
        print(f"    {'90th Percentile:':<22} {format_number(series.quantile(0.90))}")
        print(f"    {'95th Percentile:':<22} {format_number(series.quantile(0.95))}")
        print(f"    {'99th Percentile:':<22} {format_number(series.quantile(0.99))}")
        print(f"    {'Max:':<22} {format_number(series.max())}")
        print(f"    {'Sum:':<22} {format_number(series.sum())}")
        print(f"    {'Variance:':<22} {format_number(series.var())}")
        print(f"    {'Skewness:':<22} {format_number(series.skew())}")
        print(f"    {'Kurtosis:':<22} {format_number(series.kurtosis())}")
        iqr = series.quantile(0.75) - series.quantile(0.25)
        print(f"    {'IQR:':<22} {format_number(iqr)}")
        cv = series.std() / series.mean() if series.mean() != 0 else float("nan")
        print(f"    {'Coeff of Variation:':<22} {format_number(cv)}")
        print(f"    {'# Zeros:':<22} {(series == 0).sum():,}")
        print(f"    {'# Negatives:':<22} {(series < 0).sum():,}")
        print(f"    {'# Unique:':<22} {series.nunique():,}")


def print_datetime_stats(df: pd.DataFrame, dt_cols: list[str]) -> None:
    if not dt_cols:
        return

    print(section("DATETIME COLUMN STATISTICS"))

    for col in dt_cols:
        series = df[col].dropna()
        if series.empty:
            continue

        print(f"\n  ▸ {col}")
        print(f"    {'Count:':<22} {len(series):,}")
        print(f"    {'Earliest:':<22} {series.min()}")
        print(f"    {'Latest:':<22} {series.max()}")
        span = series.max() - series.min()
        print(f"    {'Span:':<22} {span}")

        if len(series) > 1:
            diffs = series.sort_values().diff().dropna()
            print(f"    {'Mean gap:':<22} {diffs.mean()}")
            print(f"    {'Median gap:':<22} {diffs.median()}")
            print(f"    {'Min gap:':<22} {diffs.min()}")
            print(f"    {'Max gap:':<22} {diffs.max()}")


def print_categorical_stats(df: pd.DataFrame) -> None:
    cat_cols = df.select_dtypes(include=["object", "category", "string"]).columns.tolist()
    if not cat_cols:
        return

    print(section("CATEGORICAL COLUMN STATISTICS"))

    for col in cat_cols:
        series = df[col].dropna()
        if series.empty:
            continue

        print(f"\n  ▸ {col}")
        n_unique = series.nunique()
        print(f"    {'Unique values:':<22} {n_unique:,}")
        print(f"    {'Most common:':<22} {series.mode().iloc[0]}  (n={series.value_counts().iloc[0]:,})")

        if n_unique <= 20:
            print(f"    {'Value counts:'}")
            for val, count in series.value_counts().items():
                pct = count / len(series) * 100
                bar = "█" * int(pct / 2)
                print(f"      {str(val):<20} {count:>8,}  ({pct:5.1f}%)  {bar}")


def print_correlation_matrix(df: pd.DataFrame, num_cols: list[str]) -> None:
    if len(num_cols) < 2:
        return

    cols = num_cols[:10]
    print(section(f"CORRELATION MATRIX (top {len(cols)} numeric cols)"))

    corr = df[cols].corr()

    header = "  " + " " * 18 + "".join(f"{c[:8]:>10}" for c in cols)
    print(header)
    for row_name in cols:
        row_vals = "".join(f"{corr.loc[row_name, c]:>10.3f}" for c in cols)
        print(f"  {row_name[:18]:<18}{row_vals}")

    print("\n  Strong correlations (|r| > 0.7, excluding self):")
    seen = set()
    found = False
    for i, c1 in enumerate(cols):
        for c2 in cols[i + 1 :]:
            r = corr.loc[c1, c2]
            if abs(r) > 0.7 and (c1, c2) not in seen:
                print(f"    {c1} ↔ {c2}: {r:.4f}")
                seen.add((c1, c2))
                found = True
    if not found:
        print("    (none)")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Generate descriptive statistics for a CSV file.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="Examples:\n"
               "  python csv_stats.py trades.csv\n"
               "  python csv_stats.py trades.csv --top 5\n"
               "  python csv_stats.py trades.csv --no-corr\n",
    )
    parser.add_argument("csv_file", type=Path, help="Path to the CSV file")
    parser.add_argument("--top", type=int, default=None, help="Only profile the first N numeric columns")
    parser.add_argument("--no-corr", action="store_true", help="Skip the correlation matrix")
    parser.add_argument("--sep", type=str, default=",", help="CSV delimiter (default: comma)")

    args = parser.parse_args()

    if not args.csv_file.exists():
        print(f"Error: file not found — {args.csv_file}", file=sys.stderr)
        sys.exit(1)

    print(f"Loading {args.csv_file} ...")
    df = pd.read_csv(args.csv_file, sep=args.sep)

    dt_cols = detect_datetime_cols(df)
    num_cols = detect_numeric_cols(df)
    if args.top:
        num_cols = num_cols[: args.top]

    print(f"\n{'═' * 60}")
    print(f"  CSV STATISTICS — {args.csv_file.name}")
    print(f"{'═' * 60}")

    print_shape(df, dt_cols)
    print_column_types(df)
    print_numeric_stats(df, num_cols)
    print_datetime_stats(df, dt_cols)
    print_categorical_stats(df)

    if not args.no_corr:
        print_correlation_matrix(df, num_cols)

    print(f"\n{'═' * 60}")
    print("  Done.")
    print(f"{'═' * 60}\n")


if __name__ == "__main__":
    main()
