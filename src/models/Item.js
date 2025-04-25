import mongoose from "mongoose";

const PaymentSchema = new mongoose.Schema(
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
        Date: { type: Date, default: Date.now },
        Qty: Number,
        Price: Number,
        ItemName: String,
        PurchasePriceAtSale: Number,  // Purchase Price at the time of sale
        ProfitLoss: Number,  // (Sale Price - Purchase Price) * Qty
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
    },
    { timestamps: true }
);

const ItemsSchema = new mongoose.Schema(
    {
        ItemName: String,
        ItemCategory: String,
        ItemCode: String,
        SalePrice: Number,
        Discount: String,
        DiscountType: String,
        PurchasePrice: String,
        Tax: String,
        TaxRate: String,
        WholesalePrice: Number,
        MinWholesaleOrder: Number,
        Image: String,
        ItemProfit: Number,    // Profit on sale
        ItemCost: Number,   // Cost of item (Purchase Price + Tax - Discount)
        ItemCurrentQty: Number, // Current stock available
        Payment: [PaymentSchema],
        inStock: {
            type: Boolean,
            default: true
        },
        Quentity: [{
            Type: String,
            Qty: Number,
            Amount: Number,
            TaxAmount: Number,
            InvoiceNo: String,
        }],
        Stock: [
            {
                OpeningQuentity: Number,
                AtPrice: Number,
                AsOfDate: { type: Date, default: Date.now },
                MinStockMaintain: Number,
                Location: String
            }
        ],
    },
    { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);


// CURRENT QUANTITY CALCULATION
ItemsSchema.virtual("CurrentQuantity").get(function () {
    const openingQty = this.Stock.length > 0 ? this.Stock[0].OpeningQuentity || 0 : 0;

    const qtyIn = this.Quentity.reduce((total, item) => {
        if (item.Type === "PurchaseBill" || item.Type === "SaleReturn") {
            return total + (item.Qty || 0);
        }
        return total;
    }, 0);

    const qtyOut = this.Quentity.reduce((total, item) => {
        if (["SaleOrder", "PurchaseReturn", "SaleInvoice"].includes(item.Type)) {
            return total + (item.Qty || 0);
        }
        return total;
    }, 0);

    return openingQty + qtyIn - qtyOut;
});

export default ItemsSchema;