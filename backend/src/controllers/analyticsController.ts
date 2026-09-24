import { Request, Response } from 'express';
import { stockStore } from '../services/store';

export const getDashboardAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    const analytics = await stockStore.getDashboardAnalytics();
    res.json({ success: true, data: analytics });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
