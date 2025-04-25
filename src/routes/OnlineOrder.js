import express from 'express'
import { createOnlineOrder, getAllOnlineOrders, getOnlineOrderById, convertSaleinvoiceO, cancelOnlineOrder } from "../controllers/OnlineOrder.js";
import { authenticateToken } from "../middleware/authMiddleware.js";


export const OnlineOrder_router = express.Router()

OnlineOrder_router.post('/createOnlineOrder', createOnlineOrder)
OnlineOrder_router.post('/convertSaleinvoice', authenticateToken, convertSaleinvoiceO)
OnlineOrder_router.put('/cancelOnlineOrder/:id', cancelOnlineOrder)
OnlineOrder_router.get('/getAllOnlineOrders', getAllOnlineOrders)
OnlineOrder_router.get('/getOnlineOrderById/:id', getOnlineOrderById)


