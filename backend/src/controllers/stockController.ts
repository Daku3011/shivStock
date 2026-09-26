import { Request, Response } from 'express';
import { stockStore } from '../services/store';

export const getStock = async (req: Request, res: Response): Promise<void> => {
  try {
    const { finish, search, status } = req.query;
    const items = await stockStore.getItems({
      finish: finish ? String(finish) : undefined,
      search: search ? String(search) : undefined,
      status: status as any,
    });
    res.json({ success: true, count: items.length, data: items });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getItemById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const item = await stockStore.getItemById(id);
    if (!item) {
      res.status(404).json({ success: false, message: 'Laminate item not found' });
      return;
    }
    res.json({ success: true, data: item });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getItemBySku = async (req: Request, res: Response): Promise<void> => {
  try {
    const sku = String(req.params.sku);
    const item = await stockStore.getItemBySku(sku);
    if (!item) {
      res.status(404).json({ success: false, message: `Item with SKU ${sku} not found` });
      return;
    }
    res.json({ success: true, data: item });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const stockIn = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { quantity, reference, reason } = req.body;
    const qty = parseInt(quantity, 10);

    if (isNaN(qty) || qty <= 0) {
      res.status(400).json({ success: false, message: 'Invalid quantity. Must be a positive integer.' });
      return;
    }

    const result = await stockStore.stockIn(id, qty, reference, reason);
    res.json({
      success: true,
      message: `Successfully added ${qty} sheets to ${result.item.sku}`,
      data: result,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const stockOut = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { quantity, reference, reason } = req.body;
    const qty = parseInt(quantity, 10);

    if (isNaN(qty) || qty <= 0) {
      res.status(400).json({ success: false, message: 'Invalid quantity. Must be a positive integer.' });
      return;
    }

    const result = await stockStore.stockOut(id, qty, reference, reason);
    res.json({
      success: true,
      message: `Successfully removed ${qty} sheets from ${result.item.sku}`,
      data: result,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const adjustStock = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { newQuantity, reason } = req.body;
    const qty = parseInt(newQuantity, 10);

    if (isNaN(qty) || qty < 0) {
      res.status(400).json({ success: false, message: 'New quantity must be a non-negative integer.' });
      return;
    }

    const result = await stockStore.adjustStock(id, qty, reason);
    res.json({
      success: true,
      message: `Adjusted ${result.item.sku} count to ${qty} sheets`,
      data: result,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getTransactions = async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 50;
    const transactions = await stockStore.getTransactions(limit);
    res.json({ success: true, count: transactions.length, data: transactions });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const { code, finish, sku, name, category, brand, quantity, min_threshold, unit_price, location, notes } = req.body;
    if (!code || !finish) {
      res.status(400).json({ success: false, message: 'Design code and finish are required.' });
      return;
    }
    const item = await stockStore.createItem({
      code: String(code),
      finish: String(finish),
      sku: sku ? String(sku) : undefined,
      name: name ? String(name) : undefined,
      category: category ? String(category) : undefined,
      brand: brand ? String(brand) : undefined,
      quantity: quantity !== undefined ? parseInt(String(quantity), 10) : undefined,
      min_threshold: min_threshold !== undefined ? parseInt(String(min_threshold), 10) : undefined,
      unit_price: unit_price !== undefined ? parseFloat(String(unit_price)) : undefined,
      location: location ? String(location) : undefined,
      notes: notes ? String(notes) : undefined,
    });
    res.status(201).json({
      success: true,
      message: `Successfully created sheet ${item.sku}`,
      data: item,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const deleteItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    await stockStore.deleteItem(id);
    res.json({ success: true, message: 'Laminate sheet deleted successfully from catalog' });
  } catch (error: any) {
    res.status(404).json({ success: false, message: error.message });
  }
};

export const getFolders = async (req: Request, res: Response): Promise<void> => {
  try {
    const folders = await stockStore.getFolders();
    res.json({ success: true, count: folders.length, data: folders });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createFolder = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, finishes } = req.body;
    if (!name || !String(name).trim()) {
      res.status(400).json({ success: false, message: 'Folder name is required.' });
      return;
    }
    const folder = await stockStore.createFolder({
      name: String(name),
      finishes: Array.isArray(finishes) ? finishes.map(String) : undefined,
    });
    res.status(201).json({
      success: true,
      message: `Successfully created folder "${folder.name}"`,
      data: folder,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateFolder = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { name, finishes } = req.body;
    const folder = await stockStore.updateFolder(id, {
      name: name !== undefined ? String(name) : undefined,
      finishes: Array.isArray(finishes) ? finishes.map(String) : undefined,
    });
    res.json({
      success: true,
      message: `Successfully updated folder "${folder.name}"`,
      data: folder,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const deleteFolder = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const result = await stockStore.deleteFolder(id);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};


