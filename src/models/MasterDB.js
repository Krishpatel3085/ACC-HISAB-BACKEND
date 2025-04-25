import mongoose from "mongoose";

const MasterSchema = new mongoose.Schema({
    UserEmail: String,
    UserMobile: String,
    UserName: String,
    CompanyName: String,
    Type: String,
    Status: {
        type: String,
        enum: ["Accepted", "Pending", "Decline"],
        default: "Pending"
    },
    InqueryDate: { type: Date, default: Date.now },
    ExpiryDate: { type: Date },
    createdAt: { type: Date, default: Date.now },
    companyCode: {
        type: String,
        unique: true,
        sparse: true,
        default: null
    },
    Pass: String,
    Profile: [{
        BusinessName: String,
        MobileNumber: Number,
        GSTIN: String,
        EmailId: String,
        PinCode: Number,
        State: String,
        BusinessType: String,
        BusinessCategory: String,
        BusinessAddress: String,
        BusinessDesription: String,
    }],
    UserGroup: {
        type: String,
        default: "Admin",
    },
    twoFAEnabled: { type: Boolean, default: false }, // ✅ 2FA Enabled or Disabled
    twoFASecret: { type: String, default: null }
}, { timestamps: true });

const Master = mongoose.model("Master", MasterSchema);
export default Master;