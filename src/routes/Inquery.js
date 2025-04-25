import express from 'express'
import { createInquery, login, forgetPassword, verifyOtpAndChangePassword, requestOTP, requestOTPFor2FA, verifyOTPAndEnable2FA, disable2FA } from "../controllers/Inquery.js"
import { authenticateToken } from "../middleware/authMiddleware.js"

export const Inquery_router = express.Router()

Inquery_router.post('/inquiry', createInquery)
Inquery_router.post('/login', login)
Inquery_router.post('/forgetPassword', forgetPassword)
Inquery_router.post('/requestOTP', requestOTP)
Inquery_router.post('/toggle2FA', authenticateToken, requestOTPFor2FA)
Inquery_router.post('/verifyOtpAndChangePassword', verifyOtpAndChangePassword)
Inquery_router.post('/verifyOTPAndEnable2FA', authenticateToken, verifyOTPAndEnable2FA)
Inquery_router.post('/disable2FA', authenticateToken, disable2FA)


