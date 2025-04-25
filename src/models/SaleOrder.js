import mongoose from "mongoose";

const SaleOrderSchema = new mongoose.Schema({
    PartyName: { type: String, required: true },
    PhoneNumber: { type: String }, // changed from Number
    Date: { type: String, required: true },
    State: { type: String },
    TranscationType: { type: String },
    PaymentType: { type: String },
    RoundOff: { type: Number },
    Shipping: { type: Number },
    Adjustment: { type: Number },
    Discount: { type: Number },
    Total: { type: Number },
    PaidAmount: { type: Number },
    Balance: { type: Number },
    InvoiceNo: { type: String, unique: true },
    Status: { type: String, enum: ['Paid', 'Partial', 'Unpaid', 'Order Accepted'], default: 'Unpaid' },
    companyCode: { type: String, required: true },
    ChequeNumber: { type: String },
    Items: [{
        ItemName: { type: String },
        Quantity: { type: Number },
        PriceUnite: { type: Number },
        Tax: { type: String },
        TaxAmount: { type: Number }, // changed from String
        Amount: { type: Number },    // changed from String
        PurchasePrice: { type: Number },
    }],
}, { timestamps: true });

export default SaleOrderSchema;
