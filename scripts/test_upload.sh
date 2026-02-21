#!/bin/bash
# Quick test script to verify parser validation works

echo "=========================================="
echo "Testing Upload & Validation"
echo "=========================================="
echo ""

# Check backend health
echo "1. Checking backend health..."
curl -s http://localhost:8000/api/health | python3 -m json.tool
echo ""

# Upload overtrader.csv (has 2 bad rows)
echo "2. Uploading overtrader.csv (contains invalid rows)..."
curl -X POST http://localhost:8000/api/upload \
  -F "file=@../data/overtrader.csv" \
  -s | python3 -m json.tool

echo ""
echo "=========================================="
echo "Check backend logs above for validation details:"
echo "  - Should show how many rows were removed"
echo "  - Should list the row indices of bad data"
echo "=========================================="
