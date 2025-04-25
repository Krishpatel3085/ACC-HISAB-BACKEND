import mongoose from "mongoose";

const PaymentInSchema = new mongoose.Schema(
    {
        PartyName: { type: String },
        PaymentType: { type: String }, // e.g., Cash, Cheque, etc.
        Date: { type: String },
        Recived: { type: Number },
        Discount: { type: Number, default: 0 }, // Changed to Number
        Discription: { type: String, default: "" },
        Total: { type: Number },
        Status: { type: String, enum: ["Pending", "Paid", "Partial"], default: "Pending" },
        InvoiceNo: { type: String, default: "" },
        ChequeNumber: { type: Number, default: 0 }
    },
    { timestamps: true }
);

export default PaymentInSchema;
