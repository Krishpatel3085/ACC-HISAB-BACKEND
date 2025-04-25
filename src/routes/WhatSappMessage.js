import express from 'express';
import {
    createWhatsappData,
    sendWhtasppMessage,
    fetchWhatsappData,
    updateWhatsappData
} from "../controllers/WhatsappMessage.js";
import { authenticateToken } from "../middleware/authMiddleware.js";

export const WhatsApp_router = express.Router()

WhatsApp_router.post('/createWhatsappData', authenticateToken, createWhatsappData)
WhatsApp_router.post('/sendWhtasppMessage', authenticateToken, sendWhtasppMessage)
WhatsApp_router.put('/updateWhatsppMessage', authenticateToken, updateWhatsappData)
WhatsApp_router.get('/fetchWhatsappData', authenticateToken, fetchWhatsappData)


