import express from 'express';
import { createExpense, FetchExpense, updateExpense, deleteExpense } from "../controllers/Expense.js";
import { authenticateToken } from "../middleware/authMiddleware.js"

export const Expense_router = express.Router()

Expense_router.post('/createExpense', authenticateToken, createExpense)
Expense_router.put('/updateExpense/:id', authenticateToken, updateExpense)
Expense_router.delete('/deleteExpense/:id', authenticateToken, deleteExpense)
Expense_router.get('/FetchExpense', authenticateToken, FetchExpense)
