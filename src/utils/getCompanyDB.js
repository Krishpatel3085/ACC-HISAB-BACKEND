import mongoose from "mongoose";
import Master from "../models/MasterDB.js";

const getCompanyDB = async (CompanyCode) => {
    const user = await Master.findOne({ companyCode: CompanyCode });
    if (!user) throw new Error("User not found");

    const companyCode = user.companyCode;
    if (!companyCode) throw new Error("Company code not found");

    const companyDB = mongoose.connection.useDb(companyCode);
    return companyDB;
};

export default getCompanyDB;
