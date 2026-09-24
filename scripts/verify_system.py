#!/usr/bin/env python3
"""
System verification test suite for Shiv Laminate Stock Management System.
Validates catalog integrity, database schema, build outputs, and API responses.
"""

import os
import sys
import json
import time
import subprocess
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def log(msg, status="INFO"):
    colors = {
        "INFO": "\033[94m",
        "PASS": "\033[92m",
        "FAIL": "\033[91m",
        "RESET": "\033[0m"
    }
    print(f"{colors.get(status, '')}[{status}] {msg}{colors['RESET']}")

def test_catalog_integrity():
    catalog_file = os.path.join(ROOT, "database", "catalog.json")
    if not os.path.exists(catalog_file):
        log("catalog.json missing", "FAIL")
        return False

    with open(catalog_file, "r") as f:
        items = json.load(f)

    if len(items) != 137:
        log(f"Expected 137 SKUs, found {len(items)}", "FAIL")
        return False

    expected_finishes = {
        'SMT': 43, 'HG': 24, 'SF': 18, 'MS': 8, 'BO': 7,
        'FS': 7, 'CP': 7, 'BR': 7, 'GW': 3, 'STN': 6, 'HGS': 7
    }

    actual_finishes = {}
    for item in items:
        f = item.get("finish")
        actual_finishes[f] = actual_finishes.get(f, 0) + 1

    for f, count in expected_finishes.items():
        if actual_finishes.get(f) != count:
            log(f"Finish {f} count mismatch: expected {count}, got {actual_finishes.get(f)}", "FAIL")
            return False

    log("Catalog verification passed (137 SKUs across 11 finishes matching PDF)", "PASS")
    return True

def test_build_artifacts():
    backend_dist = os.path.join(ROOT, "backend", "dist", "index.js")
    frontend_dist = os.path.join(ROOT, "frontend", "dist", "index.html")

    if not os.path.exists(backend_dist):
        log(f"Backend build artifact missing: {backend_dist}", "FAIL")
        return False

    if not os.path.exists(frontend_dist):
        log(f"Frontend build artifact missing: {frontend_dist}", "FAIL")
        return False

    log("Build artifacts verified for backend (Render) and frontend (Vercel)", "PASS")
    return True

def test_agent_skill():
    skill_md = os.path.join(ROOT, ".agent", "skill", "laminate-stock-manager", "SKILL.md")
    readme_md = os.path.join(ROOT, ".agent", "skill", "laminate-stock-manager", "README.md")

    if not os.path.exists(skill_md) or not os.path.exists(readme_md):
        log("Reusable agent skill missing SKILL.md or README.md", "FAIL")
        return False

    log("Reusable agent skill structure in .agent/skill verified", "PASS")
    return True

def test_live_api():
    port = 5099
    env = os.environ.copy()
    env["PORT"] = str(port)

    # Start backend server
    proc = subprocess.Popen(
        ["node", "dist/index.js"],
        cwd=os.path.join(ROOT, "backend"),
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )

    time.sleep(2)
    try:
        # 1. Healthcheck
        url = f"http://localhost:{port}/api/health"
        req = urllib.request.urlopen(url)
        health = json.loads(req.read().decode())
        if health.get("status") != "online":
            log("Healthcheck response invalid", "FAIL")
            return False

        # 2. Stock list
        url = f"http://localhost:{port}/api/stock?finish=SMT"
        req = urllib.request.urlopen(url)
        stock = json.loads(req.read().decode())
        if stock.get("count") != 43:
            log(f"Stock endpoint finish filter failed: expected 43, got {stock.get('count')}", "FAIL")
            return False

        item_id = stock["data"][0]["id"]
        sku = stock["data"][0]["sku"]
        initial_qty = stock["data"][0]["quantity"]

        # 3. Stock In
        in_data = json.dumps({"quantity": 5, "reference": "Test Supplier", "reason": "Test Inward"}).encode('utf-8')
        in_req = urllib.request.Request(f"http://localhost:{port}/api/stock/{item_id}/in", data=in_data, headers={'Content-Type': 'application/json'})
        in_resp = json.loads(urllib.request.urlopen(in_req).read().decode())
        if in_resp["data"]["item"]["quantity"] != initial_qty + 5:
            log("Stock In quantity increment failed", "FAIL")
            return False

        # 4. Stock Out
        out_data = json.dumps({"quantity": 2, "reference": "Test Client", "reason": "Test Outward"}).encode('utf-8')
        out_req = urllib.request.Request(f"http://localhost:{port}/api/stock/{item_id}/out", data=out_data, headers={'Content-Type': 'application/json'})
        out_resp = json.loads(urllib.request.urlopen(out_req).read().decode())
        if out_resp["data"]["item"]["quantity"] != initial_qty + 3:
            log("Stock Out quantity decrement failed", "FAIL")
            return False

        # 5. Dashboard analytics
        url = f"http://localhost:{port}/api/analytics/dashboard"
        req = urllib.request.urlopen(url)
        analytics = json.loads(req.read().decode())
        if analytics["data"]["totalSKUs"] != 137:
            log(f"Analytics total SKUs mismatch: {analytics['data']['totalSKUs']}", "FAIL")
            return False

        log(f"API endpoints verified (Health, Stock In, Stock Out, Analytics) on {sku}", "PASS")
        return True
    finally:
        proc.terminate()
        proc.wait()

def main():
    log("Running Shiv Laminate Stock System Verification...")
    c1 = test_catalog_integrity()
    c2 = test_build_artifacts()
    c3 = test_agent_skill()
    c4 = test_live_api()

    if all([c1, c2, c3, c4]):
        log("ALL SYSTEM TESTS PASSED SUCCESSFULLY! Ready for production deployment.", "PASS")
        sys.exit(0)
    else:
        log("SOME TESTS FAILED.", "FAIL")
        sys.exit(1)

if __name__ == "__main__":
    main()
