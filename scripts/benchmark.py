#!/usr/bin/env python3
"""Performance benchmark script for 20x dataset scalability testing."""

import time
import requests
import pandas as pd
from pathlib import Path

# Configuration
BASE_URL = "http://localhost:8000"
DATA_DIR = Path("../data")
BENCHMARK_FILE = DATA_DIR / "judging_simulation_200k.csv"

def create_large_dataset():
    """Generate 200K trade dataset (20x multiplier)."""
    print("Creating 200K trade dataset...")

    # Load base dataset
    base_df = pd.read_csv(DATA_DIR / "calm_trader.csv")
    print(f"  Base dataset: {len(base_df):,} rows")

    # Replicate 20x
    dfs = []
    for i in range(20):
        df_copy = base_df.copy()
        # Offset timestamps to avoid duplicates
        df_copy['timestamp'] = pd.to_datetime(df_copy['timestamp']) + pd.Timedelta(days=i*30)
        dfs.append(df_copy)

    large_df = pd.concat(dfs, ignore_index=True)
    large_df.to_csv(BENCHMARK_FILE, index=False)

    file_size_mb = BENCHMARK_FILE.stat().st_size / (1024 * 1024)
    print(f"  ✓ Created {len(large_df):,} rows ({file_size_mb:.1f} MB)")
    print(f"  ✓ Saved to: {BENCHMARK_FILE}")
    return BENCHMARK_FILE


def benchmark_upload(file_path: Path):
    """Benchmark file upload speed."""
    print(f"\n📤 Benchmarking upload...")

    with open(file_path, 'rb') as f:
        files = {'file': (file_path.name, f, 'text/csv')}

        start = time.time()
        response = requests.post(f"{BASE_URL}/api/upload", files=files, timeout=300)
        elapsed = time.time() - start

    if response.status_code == 200:
        data = response.json()
        trade_count = data['trade_count']
        print(f"  ✓ Upload successful")
        print(f"  ✓ Time: {elapsed:.2f}s")
        print(f"  ✓ Trades: {trade_count:,}")
        print(f"  ✓ Speed: {trade_count/elapsed:,.0f} trades/sec")
        return data['session_id'], elapsed
    else:
        print(f"  ✗ Upload failed: {response.status_code} {response.text}")
        return None, None


def benchmark_analysis(session_id: str):
    """Benchmark analysis speed."""
    print(f"\n📊 Benchmarking analysis...")

    start = time.time()
    response = requests.post(f"{BASE_URL}/api/analysis/{session_id}", timeout=300)
    elapsed = time.time() - start

    if response.status_code == 200:
        data = response.json()
        trade_count = data.get('trade_count', 0)
        print(f"  ✓ Analysis successful")
        print(f"  ✓ Time: {elapsed:.2f}s")
        print(f"  ✓ Speed: {trade_count/elapsed:,.0f} trades/sec")

        # Show bias scores
        print(f"\n  Bias Scores:")
        print(f"    Overtrading: {data['overtrading']['score']}/100")
        print(f"    Loss Aversion: {data['loss_aversion']['score']}/100")
        print(f"    Revenge Trading: {data['revenge_trading']['score']}/100")
        print(f"    Anchoring: {data['anchoring']['score']}/100")

        return elapsed
    else:
        print(f"  ✗ Analysis failed: {response.status_code} {response.text}")
        return None


def check_backend_health():
    """Check if backend is running."""
    try:
        response = requests.get(f"{BASE_URL}/api/health", timeout=5)
        return response.status_code == 200
    except Exception:
        return False


def main():
    print("=" * 60)
    print("NATIONAL BANK BIAS DETECTOR - PERFORMANCE BENCHMARK")
    print("=" * 60)

    # Check backend
    print("\n🔍 Checking backend status...")
    if not check_backend_health():
        print("  ✗ Backend not running at", BASE_URL)
        print("  → Start with: docker compose up")
        return
    print("  ✓ Backend is healthy")

    # Create or use existing large dataset
    if not BENCHMARK_FILE.exists():
        file_path = create_large_dataset()
    else:
        file_path = BENCHMARK_FILE
        file_size_mb = file_path.stat().st_size / (1024 * 1024)
        row_count = sum(1 for _ in open(file_path)) - 1  # Exclude header
        print(f"\n  ✓ Using existing dataset: {file_path}")
        print(f"  ✓ Rows: {row_count:,} ({file_size_mb:.1f} MB)")

    # Run benchmarks
    session_id, upload_time = benchmark_upload(file_path)
    if not session_id:
        return

    analysis_time = benchmark_analysis(session_id)
    if not analysis_time:
        return

    # Summary
    total_time = upload_time + analysis_time
    print("\n" + "=" * 60)
    print("BENCHMARK SUMMARY")
    print("=" * 60)
    print(f"  Upload time:     {upload_time:.2f}s")
    print(f"  Analysis time:   {analysis_time:.2f}s")
    print(f"  Total time:      {total_time:.2f}s")
    print()

    # Pass/fail criteria
    print("ACCEPTANCE CRITERIA:")
    upload_pass = upload_time < 30
    analysis_pass = analysis_time < 10
    total_pass = total_time < 40

    print(f"  Upload < 30s:    {'✓ PASS' if upload_pass else '✗ FAIL'} ({upload_time:.1f}s)")
    print(f"  Analysis < 10s:  {'✓ PASS' if analysis_pass else '✗ FAIL'} ({analysis_time:.1f}s)")
    print(f"  Total < 40s:     {'✓ PASS' if total_pass else '✗ FAIL'} ({total_time:.1f}s)")
    print()

    if all([upload_pass, analysis_pass, total_pass]):
        print("🎉 ALL BENCHMARKS PASSED - System is scalable for judging!")
    else:
        print("⚠️  Some benchmarks failed - optimization needed")
        if not upload_pass:
            print("  → Increase file upload limits or add streaming")
        if not analysis_pass:
            print("  → Optimize bias detection algorithms or add caching")

    print("=" * 60)


if __name__ == "__main__":
    main()
