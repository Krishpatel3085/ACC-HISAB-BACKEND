import express from 'express';
import { FetchCheque } from '../controllers/Cheque.js';
import { authenticateToken } from "../middleware/authMiddleware.js"


const Cheque_router = express.Router();

// Secure route for fetching cheques
Cheque_router.get('/fetch-cheque', authenticateToken, FetchCheque);

export { Cheque_router };
