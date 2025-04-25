import mongoose from "mongoose";

const WhatSappchema = new mongoose.Schema(
    {
        WhatsAppKey: String,
        InstanceID: String,
        SendSMSToParty: Boolean,
        SendTransactionUpdateSMS: Boolean,
        PartyCurrentBalanceinSMS: Boolean,
        Sales: Boolean,
        Purchase: Boolean,
        PaymentIn: Boolean,
        PaymentOut: Boolean
    },
    { timestamps: true }
);

export default WhatSappchema;
