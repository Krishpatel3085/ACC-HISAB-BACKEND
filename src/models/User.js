import mongoose from "mongoose";


const userSchema = new mongoose.Schema({
    FirstName: { type: String, required: true },
    LastName: { type: String, required: true },
    Email: { type: String, unique: true, required: true },
    UserName: { type: String, unique: true },
    UserGroup: { type: String },
    MobileNumber: { type: String, required: true },
    Password: { type: String, required: true },
    CompanyCode: { type: String, required: true },  
    Avatar: String,
}, {
    timestamps: true,
});

export default userSchema;
