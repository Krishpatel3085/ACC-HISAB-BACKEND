import express from 'express';
import { createParty, FetchParty, updateParty, deleteParty, deleteTransaction } from "../controllers/Party.js";
import { authenticateToken } from "../middleware/authMiddleware.js";

export const Party_router = express.Router()

Party_router.post('/createParty', authenticateToken, createParty)
Party_router.put('/updateParty/:id', authenticateToken, updateParty)
Party_router.delete('/deleteParty/:id', authenticateToken, deleteParty)
Party_router.delete('/deleteTransaction', authenticateToken, deleteTransaction)
Party_router.get('/FetchParty', authenticateToken, FetchParty)
