#!/usr/bin/env python3
"""
Extracts the 137 laminate SKUs from 'SHIV LAMINATE (PASTEL COLOUR) - Sheet1 (1).pdf'
and generates catalog.json and seed.sql for Supabase.
"""

import subprocess
import json
import os

pdf_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'SHIV LAMINATE (PASTEL COLOUR) - Sheet1 (1).pdf')

out = subprocess.check_output(['pdftotext', '-layout', pdf_path, '-']).decode('utf-8')
out = out.replace('\x0c', '\n')
lines = out.split('\n')

headers = ['SMT', 'HG', 'SF', 'MS', 'BO', 'FS', 'CP', 'BR', 'GW', 'STN', 'HGS']
header_line = None
for l in lines:
    if 'SMT' in l and 'HG' in l:
        header_line = l
        break

if not header_line:
    raise ValueError("Header line not found in PDF output")

cols = {h: header_line.find(h) for h in headers}

finish_names = {
    'SMT': 'Super Matt / Suede Matt',
    'HG': 'High Gloss',
    'SF': 'Suede Finish',
    'MS': 'Matt Silk',
    'BO': 'Bark Oak',
    'FS': 'Feather Silk',
    'CP': 'Copper / Compact Plain',
    'BR': 'Brushed Finish',
    'GW': 'Gloss Wave / Grain Wood',
    'STN': 'Stone Finish',
    'HGS': 'High Gloss Sparkle'
}

items = []
start = False
for l in lines:
    if 'SMT' in l and 'HG' in l:
        start = True
        continue
    if not start or not l.strip():
        continue
    for i, h in enumerate(headers):
        start_pos = cols[h] - 3 if i > 0 else 0
        end_pos = cols[headers[i+1]] - 3 if i < len(headers) - 1 else len(l)
        chunk = l[start_pos:end_pos].strip()
        if chunk:
            for val in chunk.split():
                if val.isdigit():
                    sku = f"{h}-{val}"
                    name = f"Shiv Pastel {val} ({h})"
                    items.append({
                        "sku": sku,
                        "code": val,
                        "finish": h,
                        "finish_name": finish_names.get(h, h),
                        "name": name,
                        "category": "Pastel Colour",
                        "brand": "SHIV LAMINATE",
                        "quantity": 10,  # sensible starter count for testing
                        "min_threshold": 5,
                        "unit_price": 850.00, # standard sheet price INR estimate
                        "location": f"Rack {h[:2]}-01"
                    })

print(f"Extracted {len(items)} items across {len(headers)} finishes.")

# Write catalog.json
target_dir = os.path.dirname(__file__)
json_path = os.path.join(target_dir, 'catalog.json')
with open(json_path, 'w', encoding='utf-8') as f:
    json.dump(items, f, indent=2)
print(f"Wrote {json_path}")

# Write seed.sql
sql_path = os.path.join(target_dir, 'seed.sql')
with open(sql_path, 'w', encoding='utf-8') as f:
    f.write("-- Shiv Laminate Seed Data (137 SKUs extracted from catalog PDF)\n")
    f.write("INSERT INTO laminate_items (sku, code, finish, name, category, brand, quantity, min_threshold, unit_price, location)\nVALUES\n")
    rows = []
    for item in items:
        row = f"  ('{item['sku']}', '{item['code']}', '{item['finish']}', '{item['name']}', '{item['category']}', '{item['brand']}', {item['quantity']}, {item['min_threshold']}, {item['unit_price']}, '{item['location']}')"
        rows.append(row)
    f.write(",\n".join(rows))
    f.write("\nON CONFLICT (sku) DO UPDATE SET\n")
    f.write("  name = EXCLUDED.name,\n  finish = EXCLUDED.finish,\n  code = EXCLUDED.code;\n")

print(f"Wrote {sql_path}")
