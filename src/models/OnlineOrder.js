import mongoose from "mongoose";

const OnlineOrderSchema = new mongoose.Schema(
    {
        OrderNo: String,
        InvoiceNo: {
            type: String,
            default: null,
        },
        Status: {
            type: String,
            default: "Pending",
        },
        PaymentType: {
            type: String,
            default: "Online"
        },
        Items: [{
            ItemCode: String,
            ItemName: String,
            Quantity: Number,
            Amount: Number,
            PriceUnite: Number,
        }],
        Total: String,
        Time: String,
        Name: String,
        Phone: Number,
        Address: String,
        Quentity: Number,
        Date: String
    },
    { timestamps: true } // Corrected the typo
);

export default OnlineOrderSchema;