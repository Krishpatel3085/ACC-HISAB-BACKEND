import mongoose from "mongoose";

const ChequesSchema = new mongoose.Schema(
    {
        Type: String,
        InvoiceNo: String,
        PartyName: String,
        ChequeNumber: Number,
        Date: String,
        Total: Number,
        PaidAmount: Number, // ✅ Needed for profit/loss calc
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
    }
);

// ✅ Virtual: Profit or Loss
ChequesSchema.virtual("ProfitOrLoss").get(function () {
    const total = this.Total || 0;
    const paid = this.PaidAmount || 0;
    return paid - total; // +ve = profit, -ve = loss
});

// ✅ Virtual: Balance (based on Type)
ChequesSchema.virtual("TotalBalance").get(function () {
    const total = this.Total || 0;
    const paid = this.PaidAmount || 0;
    let balance = 0;

    switch (this.Type) {
        case "PurchaseBill":
        case "SaleReturn":
        case "PaymentOut":
            balance -= total;
            break;

        case "PurchaseReturn":
        case "SaleInvoice":
        case "PaymentIn":
            balance += total;
            break;
    }

    balance += paid; // Add received amount
    return balance;
});

export default ChequesSchema;
