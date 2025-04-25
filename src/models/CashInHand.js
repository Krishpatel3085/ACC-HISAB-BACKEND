import mongoose from "mongoose";

const PaymentSchema = new mongoose.Schema(
    {
        Total: { type: Number, default: 0 },       // Expected amount
        Balance: { type: Number, default: 0 },     // Remaining balance
        PaymentType: String,                       // e.g., Cash, UPI, etc.
        Type: String,                              // e.g., Sale-Invoice, Payment-Out
        PaidAmount: { type: Number, default: 0 },  // Amount paid
        PartyName: String,
        InvoiceNo: String,
        Date: String,
    },
    { timestamps: true }
);

const CashInHandSchema = new mongoose.Schema(
    {
        Adjustment: String,
        Amount: { type: Number, default: 0 },       // Opening balance or adjustment
        AsOfDate: String,
        Description: String,
        Payment: [PaymentSchema],                   // Embedded sub-documents
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// 🧮 Virtual: Total Profit or Loss (Paid - Expected)
CashInHandSchema.virtual("ProfitOrLoss").get(function () {
    return this.Payment?.reduce((sum, p) => sum + ((p?.PaidAmount || 0) - (p?.Total || 0)), 0) || 0;
});

// 🧮 Virtual: Total Balance
CashInHandSchema.virtual("TotalBalance").get(function () {
    return this.Payment?.reduce((sum, p) => {
        const total = p?.Total || 0;
        const paid = p?.PaidAmount || 0;

        switch (p?.Type) {
            case "PurchaseBill":
            case "SaleReturn":
            case "PaymentOut":
            case "decrease":
                sum -= total;
                break;

            case "PurchaseReturn":
            case "SaleInvoice":
            case "PaymentIn":
            case "increase":
                sum += total;
                break;
        }

        sum += paid; // Add paid amount always
        return sum;
    }, 0) || 0;
});

export default CashInHandSchema;
