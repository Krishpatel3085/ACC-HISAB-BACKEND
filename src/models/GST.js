import mongoose from "mongoose";

const GSTSchema = new mongoose.Schema(
    {
        TaxName: String,
        TaxRate: String,
        TaxType: String,
        Sale: [{
            Type: String,
            Amount: Number,
            TaxAmount: Number,
        }],
        Purchase: [{
            Type: String,
            TaxAmount: Number,
            Amount: Number
        }],
    },
    { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);


// **Virtual to Calculate Total Sale Amount**
GSTSchema.virtual("TotalSaleAmount").get(function () {
    return this.Sale.reduce((sum, sale) => sum + (sale.Amount || 0), 0);
});

// **Virtual to Calculate Total Sale Tax Amount**
GSTSchema.virtual("TotalSaleTaxAmount").get(function () {
    return this.Sale.reduce((sum, sale) => sum + (sale.TaxAmount || 0), 0);
});

// **Virtual to Calculate Total Purchase Amount**
GSTSchema.virtual("TotalPurchaseAmount").get(function () {
    return this.Purchase.reduce((sum, purchase) => sum + (purchase.Amount || 0), 0);
});

// **Virtual to Calculate Total Purchase Tax Amount**
GSTSchema.virtual("TotalPurchaseTaxAmount").get(function () {
    return this.Purchase.reduce((sum, purchase) => sum + (purchase.TaxAmount || 0), 0);
});

export default GSTSchema;