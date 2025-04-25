import express from 'express';
import { CreatePurchaseBill, UpdatePurchaseBill, GetPurchaseBills, DeletePurchaseBill, FindPurchaseBill } from "../controllers/PurchaseBill.js"
import { authenticateToken } from "../middleware/authMiddleware.js";


export const PurchaseBill_router = express.Router()

PurchaseBill_router.post('/createPurchaseBill', authenticateToken, CreatePurchaseBill)
PurchaseBill_router.get('/FetchPurchaseBill', authenticateToken, GetPurchaseBills)
PurchaseBill_router.put('/UpdatePurchaseBill/:id', authenticateToken, UpdatePurchaseBill)
PurchaseBill_router.delete('/DeletePurchaseBill/:id', authenticateToken, DeletePurchaseBill)
PurchaseBill_router.get('/FindPurchaseBill/:id', authenticateToken, FindPurchaseBill)
