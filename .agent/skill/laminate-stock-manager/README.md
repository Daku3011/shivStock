# Laminate Stock Manager

## Inputs
- **Catalog Sources**:
  - `SHIV LAMINATE (PASTEL COLOUR) - Sheet1 (1).pdf` (Default pastel colour series)
  - Custom User Folders (e.g. *Heavy Texture (HT)*, *Matt Silk (MS)*, *1.0mm Folder*)
- **Folder Management Parameters**:
  - `name`: Name of the folder (e.g. "Heavy Texture Collection")
  - `finishes`: List of finishes supported in the folder (e.g. `['MS', 'HT']`)
- **Sheet Cataloging Parameters**:
  - `folder`: Target catalog folder
  - `code`: Design number (e.g. `101`, `1901`)
  - `finish`: Finish code (e.g. `MS`, `HT`, `HG`)
  - `quantity`: Initial sheets count
  - `min_threshold`: Low stock alert threshold (default 5)
- **Stock Movement Parameters**:
  - `sku` (e.g. `MS-101`, `HT-101`, `SMT-1901`)
  - `type` (`IN` | `OUT`)
  - `quantity` (positive integer)
  - `reference` (optional customer/supplier note)
  - `reason` (optional movement explanation)

## Outputs
- **Stock Summary**:
  - `totalSheets`: Total number of laminate sheets across all folders.
  - `activeSKUs`: Total distinct design-finish combinations.
  - `lowStockCount`: Number of items with count <= `min_threshold`.
  - `outOfStockCount`: Number of items with 0 sheets.
- **Folder & Finish Breakdown**: Distribution array mapping folders and finishes to sheet counts.
- **Audit Records**: Immutable timestamped ledger entries for all stock operations.

## Design Specifications
- **Theme**: Light Mode (`bg-slate-50` / `#f8fafc`, white cards, slate text `#0f172a`).
- **Security**: Direct single-owner access without PIN code requirement.

## Dependencies
- React Native / Expo SDK 52 (`mobile/`)
- React 18 + Vite + Tailwind CSS (`frontend/`)
- `@react-native-async-storage/async-storage`
