import { Router } from 'express';
import {
  getStock,
  getItemById,
  getItemBySku,
  stockIn,
  stockOut,
  adjustStock,
  getTransactions,
} from '../controllers/stockController';
import { getDashboardAnalytics } from '../controllers/analyticsController';
import { loginWithPin, verifySession } from '../controllers/authController';

const router = Router();

// Healthcheck
router.get('/health', (req, res) => {
  res.json({
    status: 'online',
    system: 'Shiv Laminate Stock Management System',
    timestamp: new Date().toISOString(),
  });
});

// Authentication
router.post('/auth/login', loginWithPin);
router.get('/auth/verify', verifySession);

// Stock endpoints
router.get('/stock', getStock);
router.get('/stock/sku/:sku', getItemBySku);
router.get('/stock/:id', getItemById);
router.post('/stock/:id/in', stockIn);
router.post('/stock/:id/out', stockOut);
router.post('/stock/:id/adjust', adjustStock);

// Transactions & Ledger
router.get('/transactions', getTransactions);

// Analytics
router.get('/analytics/dashboard', getDashboardAnalytics);

export default router;
