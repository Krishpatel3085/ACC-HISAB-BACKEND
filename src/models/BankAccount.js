import mongoose from "mongoose";

// Subdocument schema for Payment
const PaymentSchema = new mongoose.Schema({
    Total: { type: Number, default: 0 },        // Expected amount
    Balance: { type: Number, default: 0 },      // Remaining balance
    PaymentType: { type: String },
    Type: { type: String },
    PaidAmount: { type: Number, default: 0 },   // Paid amount
    PartyName: { type: String },
    InvoiceNo: { type: String },
    Date: { type: String },
}, { timestamps: true });

const BankAccountSchema = new mongoose.Schema({
    AccountDisplayName: { type: String },
    AsOfDate: { type: String },
    AccountNumber: { type: Number },
    IfscCode: { type: String },
    UpiId: { type: String },
    BankName: { type: String },
    AccountHolderName: { type: String },
    Payment: [PaymentSchema], // Array of subdocuments
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// ✅ Virtual: Total Balance
BankAccountSchema.virtual("TotalBalance").get(function () {
    return (this.Payment || []).reduce((sum, p) => sum + (p.Balance || 0), 0);
});

// ✅ Virtual: Net Amount (Considering type of transaction)
BankAccountSchema.virtual("Amount").get(function () {
    return (this.Payment || []).reduce((sum, p) => {
        const paid = p.PaidAmount || 0;

        switch (p.Type) {
            case "PurchaseBill":
            case "SaleReturn":
            case "PaymentOut":
                return sum - paid; // પૈસા બેંકમાંથી ગયા

            case "PurchaseReturn":
            case "SaleInvoice":
            case "PaymentIn":
                return sum + paid; // પૈસા બેંકમાં આવ્યા
            
            default:
                return sum;
        }
    }, 0);
});

// ✅ Virtual: Profit or Loss
BankAccountSchema.virtual("ProfitOrLoss").get(function () {
    return (this.Payment || []).reduce((sum, p) => {
        const total = p.Total || 0;
        const paid = p.PaidAmount || 0;
        return sum + (paid - total);
    }, 0);
});

export default BankAccountSchema;
