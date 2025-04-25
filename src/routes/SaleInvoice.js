import express from 'express';
import { CreateSaleInvoice, UpdateSaleInvoice, GetSaleInvoice, DeleteSaleInvoice, FindSaleInvoice } from "../controllers/SaleInvoice.js";
import { authenticateToken } from "../middleware/authMiddleware.js";


export const SaleInvoice_router = express.Router()

SaleInvoice_router.post('/createSaleInvoice', authenticateToken, CreateSaleInvoice)
SaleInvoice_router.get('/FetchSaleInvoice', authenticateToken, GetSaleInvoice)
SaleInvoice_router.put('/UpdateSaleInvoice/:id', authenticateToken, UpdateSaleInvoice)
SaleInvoice_router.delete('/DeleteSaleInvoice/:id', authenticateToken, DeleteSaleInvoice)
SaleInvoice_router.get('/FindSaleInvoice/:id', authenticateToken, FindSaleInvoice)
