import express from 'express';
import { createTax, fetchTax } from "../controllers/GST.js";
import { authenticateToken } from "../middleware/authMiddleware.js"

export const GstTax_router = express.Router()

GstTax_router.post('/createTax', authenticateToken, createTax)
GstTax_router.get('/fetchTax', authenticateToken, fetchTax)

