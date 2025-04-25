import mongoose from "mongoose";
import GSTSchema from "../models/GST.js"; 
import Master from "../models/MasterDB.js";
import MESSAGES from "../config/messages.js";

const createTax = async (req, res) => {
    try {
        const TaxData = req.body;
        const CompanyCode = req.user["companyCode"];

        // Step 1: Find the user in the Master Database
        const user = await Master.findOne({ companyCode: CompanyCode });
        if (!user) return res.status(404).json({ message: MESSAGES.USER_NOT_FOUND });

        // Step 2: Get the user's Company Code
        const companyCode = user.companyCode;
        if (!companyCode) return res.status(400).json({ message:MESSAGES.ERROR.COMPANY_NOT_FOUND });

        // Step 3: Connect to the specific CompanyCode Database
        const companyDB = mongoose.connection.useDb(companyCode);

        // Step 4: Define the Tax model in the specific database
        const TaxModel = companyDB.models.GST || companyDB.model("GST", GSTSchema);

        // Step 5: Validate input data
        if (!TaxData.TaxName || !TaxData.TaxRate) {
            return res.status(400).json({ message: MESSAGES.ERROR.TAX_RATE_TAX_NAME_REQUIRED });
        }

        // Step 6: Save the tax record
        const tax = new TaxModel({ ...TaxData });
        await tax.save();

        res.status(201).json({ message: MESSAGES.SUCCESS.GST_TAX_CREATED, companyCode });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Function to fetch tax details
const fetchTax = async (req, res) => {
    try {
        const CompanyCode = req.user["companyCode"];

        // Step 1: Find the user in the Master Database
        const user = await Master.findOne({ companyCode: CompanyCode });
        if (!user) return res.status(404).json({ mwssage: MESSAGES.USER_NOT_FOUND });

        // Step 2: Get the user's Company Code
        const companyCode = user.companyCode;
        if (!companyCode) return res.status(400).json({ message: MESSAGES.COMPANY_NOT_FOUND });

        // Step 3: Connect to the specific CompanyCode Database
        const companyDB = mongoose.connection.useDb(companyCode);

        // Step 4: Define the Tax model in the specific database
        const TaxModel = companyDB.models.GST || companyDB.model("GST", GSTSchema);

        // Step 5: Fetch all tax records
        const taxes = await TaxModel.find();

        res.status(200).json({ taxes });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export { createTax, fetchTax };
