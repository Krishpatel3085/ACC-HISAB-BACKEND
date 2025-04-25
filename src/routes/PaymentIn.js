import express from 'express';
import {
    createPaymentIn,
    FetchPaymentIn,
    updatePaymentIn,
    deletePaymentIn
} from '../controllers/PaymentIn.js';

import { authenticateToken } from "../middleware/authMiddleware.js";

export const PaymentIn_router = express.Router();

PaymentIn_router.post('/createPaymentIn', authenticateToken, createPaymentIn);
PaymentIn_router.put('/updatePaymentIn/:id', authenticateToken, updatePaymentIn);
PaymentIn_router.delete('/deletePaymentIn/:id', authenticateToken, deletePaymentIn);
PaymentIn_router.get('/FetchPaymentIn', authenticateToken, FetchPaymentIn);

