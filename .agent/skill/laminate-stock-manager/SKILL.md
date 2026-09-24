# Laminate Stock Manager Skill

## Overview
The `laminate-stock-manager` skill provides specialized knowledge, data schemas, validation routines, and catalog definitions for decorative laminate sheets, specifically tailored for the **Shiv Laminate (Pastel Colour Series)**.

## Finish Code Classifications
The system categorizes all 137 Shiv Laminate SKUs across 11 standard architectural finishes:
- **SMT**: Super Matt / Suede Matt (Smooth non-reflective matte finish) - 43 Design Codes
- **HG**: High Gloss (Reflective mirror-like gloss surface) - 24 Design Codes
- **SF**: Suede Finish (Standard textured suede surface) - 18 Design Codes
- **MS**: Matt Silk / Matt Suede (Soft-touch silky matte) - 8 Design Codes
- **BO**: Bark Oak (Woodgrain texture finish) - 7 Design Codes
- **FS**: Feather Silk / Fabric Soft (Fabric textured finish) - 7 Design Codes
- **CP**: Copper / Compact Plain (Metallic/plain architectural finish) - 7 Design Codes
- **BR**: Brushed Finish (Directional brushed texture) - 7 Design Codes
- **GW**: Gloss Wave / Grain Wood (Waved gloss texture) - 3 Design Codes
- **STN**: Stone Finish (Textured stone/mineral feel) - 6 Design Codes
- **HGS**: High Gloss Sparkle / Solid (Premium sparkle gloss) - 7 Design Codes (1991-1997)

## SKU Format
Standard format: `{FINISH}-{CODE}`
Examples:
- `SMT-1901`
- `HG-1908`
- `HGS-1991`

## Key Capabilities
1. **Catalog Resolution**: Quick search and cross-finish lookup by 4-digit design number (e.g. searching "1903" returns all 10 finishes available in shade 1903).
2. **Stock In (Inward)**: Validates batch additions, notes supplier/invoice reference, increments stock level.
3. **Stock Out (Outward)**: Validates available stock to prevent negative inventory, logs customer/job reference, decrements stock level.
4. **Audit Ledger**: Tracks every stock movement with timestamp, delta, previous count, and reason.
5. **Analytics Calculation**: Calculates turnover rate, finish-wise distribution, reorder alerts, and daily velocity.
