import mongoose from "mongoose";
import PartiesSchema from "../models/Party.js";
import Master from "../models/MasterDB.js";

// Utility: Get Party Model based on companyCode
const getPartyModel = async (companyCode) => {
    const companyDB = mongoose.connection.useDb(companyCode);
    return companyDB.models.Parties || companyDB.model("Parties", PartiesSchema);
};

// Utility: Verify company & return code
const verifyCompany = async (userCompanyCode) => {
    if (!userCompanyCode) throw new Error("Company code is missing from user");
    const user = await Master.findOne({ companyCode: userCompanyCode });
    if (!user) throw new Error("User not found in Master DB");
    return user.companyCode;
};

export { getPartyModel, verifyCompany };