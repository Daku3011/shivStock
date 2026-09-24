# Laminate Stock Manager Skill

## Overview
The `laminate-stock-manager` skill provides specialized knowledge, data schemas, validation routines, catalog definitions, and folder organization for decorative laminate sheets across both **Mobile (React Native / Expo)** and **Web (React + Tailwind)**.

## Catalog Folders
Laminates are organized into catalog book **Folders**:
- **Pastel Colour** (Default Shiv Laminate Pastel Series): Contains 137 design SKUs across 11 architectural finishes.
- **Custom Folders**: Dynamic user-defined folders (e.g. *Heavy Texture (HT)*, *Matt Silk (MS)*, *1.0mm Folder*, *Acrylic Collection*), each maintaining its own set of finishes and sheets.

## Finish Code Classifications
The system supports both standard and dynamic finish classifications:
- **MS**: Matt Silk / Matt Suede (Soft-touch silky matte)
- **HT**: Heavy Texture / High Texture (Deep tactile architectural texture)
- **SMT**: Super Matt / Suede Matt (Smooth non-reflective matte finish)
- **HG**: High Gloss (Reflective mirror-like gloss surface)
- **SF**: Suede Finish (Standard textured suede surface)
- **BO**: Bark Oak (Woodgrain texture finish)
- **FS**: Feather Silk / Fabric Soft (Fabric textured finish)
- **CP**: Copper / Compact Plain (Metallic/plain architectural finish)
- **BR**: Brushed Finish (Directional brushed texture)
- **GW**: Gloss Wave / Grain Wood (Waved gloss texture)
- **STN**: Stone Finish (Textured stone/mineral feel)
- **HGS**: High Gloss Sparkle / Solid (Premium sparkle gloss)
- **Custom Finishes**: User-defined finish codes (e.g. `MATT`, `GLOSS`, `WOOD`).

## SKU Format
Standard format: `{FINISH}-{CODE}`
Examples:
- `MS-101`
- `HT-101`
- `SMT-1901`
- `HG-1908`

## UI Architecture (MCP Stitch Design System)
- **Theme**: High-contrast, clean Light Theme with crisp card borders, light slate background (`#f8fafc` / `bg-slate-50`), and high-legibility typography.
- **Access Model**: Single-owner frictionless operations (no blocking PIN code).
- **Navigation**: Segmented tabs for Stock, Analytics, and Audit Ledger.
- **Folder Navigation**: Horizontal scrolling folder selector with active pill styling and item counter badges.

## Key Capabilities
1. **Multi-Folder Management**: Create and switch between catalog folders with custom finish configurations.
2. **Sheet Cataloging**: Add new design codes with automated SKU generation, initial stock, and minimum thresholds.
3. **Stock In (Inward)**: Instant single-tap +1 stepper or batch inward with supplier/challan reference.
4. **Stock Out (Outward)**: Instant single-tap -1 stepper or batch dispatch with inventory floor validation.
5. **Audit Ledger**: Comprehensive immutable audit history of all transactions.
6. **Analytics**: Folder breakdown, finish distribution, reorder watchlists, and velocity tracking.
