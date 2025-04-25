import express from 'express';
import {
    createCashInHand,
    FetchCashInHand,
    updateCashInHand,
    deleteCashInHand
} from '../controllers/CashInHand.js';
import { authenticateToken } from "../middleware/authMiddleware.js"

export const Cash_router = express.Router();

// 🔐 Protect all routes with authentication middleware
Cash_router.use(authenticateToken);

// 💰 Cash In Hand routes
Cash_router.post('/createCash', createCashInHand);
Cash_router.get('/fetchCash', FetchCashInHand);
Cash_router.put('/updateCash/:id', updateCashInHand);
Cash_router.delete('/deleteCash/:id', deleteCashInHand);


