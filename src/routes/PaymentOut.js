import express from 'express'
import { createPaymentOut, FetchPaymentOut, updatePaymentOut, deletePaymentOut } from "../controllers/PaymentOut.js"
import { authenticateToken } from "../middleware/authMiddleware.js";

export const PaymentOut_router = express.Router()

PaymentOut_router.post('/createPaymentOut', authenticateToken, createPaymentOut)
PaymentOut_router.put('/updatePaymentOut/:id', authenticateToken, updatePaymentOut)
PaymentOut_router.delete('/deletePaymentOut/:id', authenticateToken, deletePaymentOut)
PaymentOut_router.get('/FetchPaymentOut', authenticateToken, FetchPaymentOut)

