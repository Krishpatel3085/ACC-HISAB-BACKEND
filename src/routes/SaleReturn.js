import express from 'express';
import { CreateSaleReturn, UpdateSaleIReturn, GetSaleReturn, DeleteSaleReturn, FindSaleReturn } from "../controllers/SaleReturn.js";
import { authenticateToken } from "../middleware/authMiddleware.js";


export const SaleReturn_router = express.Router()

SaleReturn_router.post('/createSaleReturn', authenticateToken, CreateSaleReturn)
SaleReturn_router.get('/FetchSaleReturn', authenticateToken, GetSaleReturn)
SaleReturn_router.put('/UpdateSaleReturn/:id', authenticateToken, UpdateSaleIReturn)
SaleReturn_router.delete('/DeleteSaleReturn/:id', authenticateToken, DeleteSaleReturn)
SaleReturn_router.get('/FindSaleReturn/:id', authenticateToken, FindSaleReturn)
