import express from 'express';
import { Salerevanue, getIncomeExpenseSummary, getSaleMonthlyYearlySummary } from "../controllers/Dashboard.js";
import { authenticateToken } from "../middleware/authMiddleware.js"

export const Dashboard_router = express.Router()


Dashboard_router.get("/salerevenue", authenticateToken, Salerevanue);
Dashboard_router.get('/income-expense-summary', authenticateToken, getIncomeExpenseSummary)
Dashboard_router.get('/sale-monthly-yearly-summary', authenticateToken, getSaleMonthlyYearlySummary);