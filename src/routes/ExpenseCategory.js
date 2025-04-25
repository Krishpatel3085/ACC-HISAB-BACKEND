import express from 'express'
import { FetchExpenseCategory, createExpenseCategory, deleteExpenseCategory } from "../controllers/ExpenseCategory.js"
import { authenticateToken } from "../middleware/authMiddleware.js"


export const ExpenseCategory_router = express.Router()

ExpenseCategory_router.post('/createExpenseCategory', authenticateToken, createExpenseCategory)
ExpenseCategory_router.get('/FetchExpenseCategory', authenticateToken, FetchExpenseCategory)
ExpenseCategory_router.delete('/DeleteExpenseCategory/:id', authenticateToken, deleteExpenseCategory)


