import mongoose from "mongoose";

const ExpenseSchema = new mongoose.Schema({
    Date: String,
    CategoryName: String,
    InvoiceNo: String,
    PaymentType: String,
    Description: String,
    Payment: Number,
    Amount: Number,
    ChequeNumber: Number,
    createdAt: { type: Date, default: Date.now }
});

export default ExpenseSchema;