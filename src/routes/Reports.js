import express from 'express';
import { getAllItemsNetProfitOrLoss } from '../controllers/Reports/ItemWiseProfit.js';
import { getAllPartiesNetProfitOrLoss } from '../controllers/Reports/PartyWiseProfit.js';
import { getProfitAndLoss } from '../controllers/Reports/Profit&Loss.js';
import { authenticateToken } from "../middleware/authMiddleware.js"


const Reports_Router = express.Router();

// Secure route for fetching cheques
Reports_Router.get('/itemWiseProfit', authenticateToken, getAllItemsNetProfitOrLoss);
Reports_Router.get('/PartyWiseProfit', authenticateToken, getAllPartiesNetProfitOrLoss);
Reports_Router.get('/Profit&Loss', authenticateToken, getProfitAndLoss);

export { Reports_Router };
