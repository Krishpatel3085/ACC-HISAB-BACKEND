import mongoose from "mongoose";

const PaymentOutSchema = new mongoose.Schema(
    {
        PartyName: { type: String },
        PaymentType: { type: String },
        Date: { type: String }, // consider using Date type if storing actual date
        Recived: { type: Number, default: 0 },
        Discount: { type: String, default: "0" },
        Description: { type: String },
        ReceiptNo: { type: String },
        Total: { type: Number, default: 0 }, // better to store as Number for calculation
        Status: { type: String, enum: ["Paid", "Partial", "Unpaid"], default: "Unpaid" },
        InvoiceNo: { type: String, unique: true },
        ChequeNumber: { type: Number }
    },
    { timestamps: true }
);

export default PaymentOutSchema;
