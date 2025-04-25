import express from 'express';
import {
    createCategory,
    fetchCategory,
    fetchOnlineCategory,
    updateCategory,
    deleteCategory
} from "../controllers/Category.js";

import { authenticateToken } from "../middleware/authMiddleware.js"


export const Category_router = express.Router();

// Private Routes (Authenticated)
Category_router.post('/createCategory', authenticateToken, createCategory);
Category_router.put('/updateCategory/:id', authenticateToken, updateCategory);
Category_router.delete('/deleteCategory/:id', authenticateToken, deleteCategory);
Category_router.get('/fetchCategory', authenticateToken, fetchCategory);

// Public Route
Category_router.get('/fetch-online', fetchOnlineCategory);


