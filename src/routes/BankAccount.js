import express from 'express';
import {
    createBankAccount,
    FetchBankAccount,
    updateBankAccount,
    deleteBankAccount
} from '../controllers/BankAccount.js';
import { authenticateToken } from "../middleware/authMiddleware.js"


export const BankAccount_router = express.Router();

// Apply auth middleware to all bank account routes
BankAccount_router.use(authenticateToken);

// Bank Account Routes
BankAccount_router.post('/createBank', createBankAccount);
BankAccount_router.get('/FetchallBank', FetchBankAccount);
BankAccount_router.put('/updateBank/:id', updateBankAccount);
BankAccount_router.delete('/deleteBank/:id', deleteBankAccount);


