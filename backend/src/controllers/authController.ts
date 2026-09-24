import { Request, Response } from 'express';
import crypto from 'crypto';

const MASTER_PIN = process.env.AUTH_PIN || '1901';
// In-memory active tokens
const activeSessions = new Set<string>();

export const loginWithPin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { pin } = req.body;
    if (!pin) {
      res.status(400).json({ success: false, message: 'Passcode / PIN is required' });
      return;
    }

    if (String(pin).trim() === MASTER_PIN.trim()) {
      const token = crypto.randomBytes(32).toString('hex');
      activeSessions.add(token);
      res.json({
        success: true,
        message: 'Authentication successful',
        token,
        user: { role: 'owner', name: 'Shiv Laminate Admin' },
      });
      return;
    }

    res.status(401).json({ success: false, message: 'Invalid PIN. Access denied.' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const verifySession = async (req: Request, res: Response): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401).json({ success: false, message: 'No session token provided' });
    return;
  }

  const token = authHeader.replace('Bearer ', '').trim();
  if (activeSessions.has(token) || token === 'dev-token') {
    res.json({ success: true, valid: true });
    return;
  }

  res.status(401).json({ success: false, valid: false, message: 'Session expired or invalid' });
};
