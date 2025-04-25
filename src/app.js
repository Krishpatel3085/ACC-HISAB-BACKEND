import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import connectDB from './config/db.js';
import dotenv from 'dotenv';
import { Master_router } from './routes/MasterDB.js';
import { Inquery_router } from './routes/Inquery.js';
import { Party_router } from './routes/Party.js';
import { SendOtp, VerifyOtp } from './config/SendEmailOtp.js';
import { Item_router } from './routes/Item.js';
import { Category_router } from './routes/Category.js';
import { BankAccount_router } from './routes/BankAccount.js';
import { Cash_router } from './routes/CashInHand.js';
import { Cheque_router } from './routes/Cheque.js';
import { PaymentIn_router } from './routes/PaymentIn.js';
import { PaymentOut_router } from './routes/PaymentOut.js';
import { Expense_router } from './routes/Expense.js';
import { PurchaseBill_router } from './routes/PurchaseBill.js';
import { PurchaseReturn_router } from './routes/PurchaseReturn.js';
import { SaleInvoice_router } from './routes/SaleInvoice.js';
import { SaleReturn_router } from './routes/SaleReturn.js';
import { GstTax_router } from './routes/GST.js';
import { ExpenseCategory_router } from './routes/ExpenseCategory.js';
import { SaleOrder_router } from './routes/SaleOrder.js';
import { User_Route } from './routes/User.js';
import { UserPermission_router } from './routes/UserPermission.js';
import { OnlineOrder_router } from './routes/OnlineOrder.js';
import { Dashboard_router } from './routes/Dashboard.js';
import { WhatsApp_router } from './routes/WhatSappMessage.js';
import { Reports_Router } from './routes/Reports.js';

dotenv.config();

const app = express();
connectDB();

// Middleware
app.use(cors());
app.use(helmet());
app.use(compression());
app.use(express.json());
app.use(cookieParser());
app.use(morgan('dev'));

// Routes
app.use('/Master', Master_router);
app.use('/Inquery', Inquery_router);
app.use('/Party', Party_router);
app.use('/Item', Item_router);
app.use('/Category', Category_router);
app.use('/BankAccount', BankAccount_router);
app.use('/CashInHand', Cash_router);
app.use('/Cheque', Cheque_router);
app.use('/PaymentIn', PaymentIn_router);
app.use('/PaymentOut', PaymentOut_router);
app.use('/Expense', Expense_router);
app.use('/PurchaseBill', PurchaseBill_router);
app.use('/PurchaseReturn', PurchaseReturn_router);
app.use('/SaleInvoice', SaleInvoice_router);
app.use('/SaleReturn', SaleReturn_router);
app.use('/GST', GstTax_router);
app.use('/ExpenseCategory', ExpenseCategory_router);
app.use('/SaleOrder', SaleOrder_router);
app.use('/User', User_Route);
app.use('/UserPermission', UserPermission_router);
app.use('/OnlineOrder', OnlineOrder_router);
app.use('/Dashboard', Dashboard_router);
app.use('/Whatsapp', WhatsApp_router);
app.use('/Reports', Reports_Router);

// Email OTP FOR INQUIRY CREATE
app.post('/send-otp', SendOtp)
app.post('/verify-otp', VerifyOtp)

export default app;
