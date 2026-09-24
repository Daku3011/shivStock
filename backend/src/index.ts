import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import apiRoutes from './routes/api';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const rawClientUrls = process.env.CLIENT_URL || '*';
const configuredOrigins = rawClientUrls
  .split(',')
  .map((url) => url.trim().replace(/\/+$/, ''))
  .filter(Boolean);

// Allowed origins with trailing slashes stripped
const allowedOrigins = new Set([
  ...configuredOrigins,
  'https://shiv-stock.vercel.app',
  'http://localhost:3000',
  'http://localhost:5173',
]);

const allowAll = configuredOrigins.includes('*') || configuredOrigins.length === 0;

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests (e.g. mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);

    if (allowAll) {
      return callback(null, true);
    }

    const cleanOrigin = origin.trim().replace(/\/+$/, '');
    const isAllowed =
      allowedOrigins.has(cleanOrigin) ||
      Array.from(allowedOrigins).some((allowed) => {
        if (allowed.toLowerCase() === cleanOrigin.toLowerCase()) return true;
        // Support Vercel preview branch deployments
        if (allowed.includes('vercel.app') && cleanOrigin.endsWith('.vercel.app')) {
          return true;
        }
        return false;
      });

    if (isAllowed) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
};

// Security and utility middleware
app.use(helmet({
  crossOriginResourcePolicy: false,
}));
app.use(cors(corsOptions));
app.use(morgan('dev'));
app.use(express.json());

// API Routes (mounted at /api as well as / for compatibility with or without /api prefix)
app.use('/api', apiRoutes);
app.use('/', apiRoutes);

// Root informational endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Shiv Laminate Stock API',
    description: 'Single-owner decorative laminate inventory API ready for Render deployment.',
    version: '1.0.0',
    documentation: '/api/health',
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Shiv Laminate Stock Backend running on port ${PORT}`);
  console.log(`🔗 Health check available at: http://localhost:${PORT}/api/health`);
});

export default app;
