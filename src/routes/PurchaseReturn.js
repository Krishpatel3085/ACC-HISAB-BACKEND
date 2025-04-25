import express from 'express';
import { CreatePurchaseReturn, UpdatePurchaseReturn, GetPurchaseReturns, DeletePurchaseReturns, FindPurchaseReturn } from "../controllers/PurchaseReturn.js";
import { authenticateToken } from "../middleware/authMiddleware.js";


export const PurchaseReturn_router = express.Router()

PurchaseReturn_router.post('/createPurchaseReturn', authenticateToken, CreatePurchaseReturn)
PurchaseReturn_router.get('/FetchPurchaseReturn', authenticateToken, GetPurchaseReturns)
PurchaseReturn_router.put('/UpdatePurchaseReturn/:id', authenticateToken, UpdatePurchaseReturn)
PurchaseReturn_router.delete('/DeletePurchaseReturn/:id', authenticateToken, DeletePurchaseReturns)
PurchaseReturn_router.get('/FindPurchaseReturn/:id', authenticateToken, FindPurchaseReturn)
