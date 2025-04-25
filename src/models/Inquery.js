import mongoose from "mongoose";

const InquirySchema = new mongoose.Schema({
    FirstName: String,
    LastName: String,
    UserEmail: String,
    UserMobile: Number,
    UserName: String,
    CompanyName: String,
    Pass: String,
    InqueryDate: String,
    InqueryTime: String,
    Verification: {
        type: String,
        default: 'False',
        enum: ['True', 'False']
    },
    Status: {
        type: String,
        default: 'InActive',
        enum: ['Active', 'InActive']
    },
    InqueryID: String,
    createdAt: { type: Date, default: Date.now }
});

const Inquiry = mongoose.models.Inquiry || mongoose.model("Inquiry", InquirySchema);

export default Inquiry;
