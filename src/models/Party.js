import mongoose from "mongoose";

const PartiesSchema = new mongoose.Schema(
    {
        PartyName: String,
        GstNo: String,
        PhoneNumber: Number,
        GstType: String,
        State: String,
        EmailId: String,
        BillingAddress: String,
        ShippingAddress: String,
        Remark: String,
        PartyProfit: Number,
        PartyAmount: Number,  // Total amount of all transactions
        Receivable: Number,  // Total amount receivable from the party
        Payable: Number,  // Total amount payable to the party
        TotalSale: Number,  // Total sale amount of the party
        TotalPurchase: Number,  // Total purchase amount of the party
        Payment: [
            {
                Total: Number,
                Balance: Number,
                PaymentType: String,
                Type: String,
                PaidAmount: Number,
                PartyName: String,
                InvoiceNo: String,
                TaxRate: Number,
                TaxAmount: Number,
                Status: String,
                Date: String,
                Items: [
                    {
                        ItemName: String,
                        PurchasePrice: Number,
                        Quantity: Number,
                        PriceUnite: Number,
                        TaxRate: Number,
                        TaxAmount: Number,
                        Amount: Number,
                        RoundOff: Number,
                    }
                ],
            }, { timestamps: true },
        ],
    },
    { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);


PartiesSchema.virtual("Amount").get(function () {
    return (this.Payment || []).reduce((sum, payment) => {
        if (payment.Status === "Paid") return sum; // Skip fully paid transactions

        const total = payment.Total || 0;
        const paidAmount = payment.PaidAmount || 0;

        switch (payment.Type) {
            case "PurchaseBill":
            case "SaleReturn":
            case "PaymentOut":
                sum -= total;
                break;

            case "PurchaseReturn":
            case "SaleInvoice":
            case "PaymentIn":
                sum += total;
                break;
        }

        sum += paidAmount; // Always add paid amount (received money)

        return sum;
    }, 0);
});


// ✅ Total Purchase Tax (Tax paid on purchases)
PartiesSchema.virtual("TotalPurchaseTax").get(function () {
    return (this.Payment || []).reduce((sum, payment) => {
        if (["PurchaseBill", "PaymentOut"].includes(payment.Type)) {
            return sum + (payment.TaxAmount || 0);
        }
        return sum;
    }, 0);
});

// ✅ Total Sale Tax (Tax collected from sales)
PartiesSchema.virtual("TotalSaleTax").get(function () {
    return (this.Payment || []).reduce((sum, payment) => {
        if (["SaleInvoice", "PaymentIn"].includes(payment.Type)) {
            return sum + (payment.TaxAmount || 0);
        }
        return sum;
    }, 0);
});


// ✅ Receivable Amount (Total Paid Amount)
PartiesSchema.virtual("ReceivableBalance").get(function () {
    return (this.Payment || []).reduce((sum, payment) => sum + (payment.PaidAmount || 0), 0);
});

// ✅ Payable Amount (Total Balance Amount)
PartiesSchema.virtual("PayableBalance").get(function () {
    return (this.Payment || []).reduce((sum, payment) => sum + (payment.Balance || 0), 0);
});

export default PartiesSchema;