# Laminate Stock Manager

## Inputs
- **Catalog Source**: `SHIV LAMINATE (PASTEL COLOUR) - Sheet1 (1).pdf` containing design code matrix.
- **Stock Movement Parameters**:
  - `sku` (e.g. `SMT-1901`) or `itemId`
  - `type` (`IN` | `OUT` | `ADJUSTMENT`)
  - `quantity` (positive integer)
  - `reference` (optional customer/supplier note)
  - `reason` (optional movement explanation)

## Outputs
- **Stock Summary**:
  - `totalSheets`: Total number of laminate sheets across warehouse.
  - `activeSKUs`: Total distinct design-finish combinations (137).
  - `lowStockCount`: Number of items with count <= `min_threshold` (default 5).
  - `outOfStockCount`: Number of items with 0 sheets.
- **Finish Breakdown**: Distribution array mapping each finish code (`SMT`, `HG`, etc.) to total sheets and active items.
- **Audit Records**: Immutable timestamped ledger entries for all stock operations.

## Dependencies
- Node.js >= 18 or Python 3.10+
- Supabase PostgreSQL / REST API
