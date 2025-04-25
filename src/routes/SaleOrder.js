import express from 'express';
import { CreateSaleOrder, UpdateSaleIOrder, GetSaleOrder, DeleteSaleOrder, FindSaleOrder, convertSaleinvoice } from "../controllers/SaleOrder.js";
import { authenticateToken } from "../middleware/authMiddleware.js";

export const SaleOrder_router = express.Router()

SaleOrder_router.post('/createSaleOrder', authenticateToken, CreateSaleOrder)
SaleOrder_router.post('/convertSaleinvoice', authenticateToken, convertSaleinvoice)
SaleOrder_router.get('/FetchSaleOrder', authenticateToken, GetSaleOrder)
SaleOrder_router.get('/FetchSingleSaleOrder/:id', authenticateToken, FindSaleOrder)
SaleOrder_router.put('/UpdateSaleOrder/:id', authenticateToken, UpdateSaleIOrder)
SaleOrder_router.delete('/DeleteSaleOrder/:id', authenticateToken, DeleteSaleOrder)

