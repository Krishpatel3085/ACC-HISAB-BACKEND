import mongoose from "mongoose";
import Master from "../models/MasterDB.js";
import ChequesSchema from "../models/Cheque.js";
import MESSAGES from "../config/messages.js";

const FetchCheque = async (req, res) => {
    try {
        const CompanyCode = req.user?.companyCode;
        if (!CompanyCode) return res.status(401).json({ message :MESSAGES.ERROR.COMPANY_CODE_REQUIRED });

        // Step 1: Validate user existence
        const user = await Master.findOne({ companyCode: CompanyCode });
        if (!user) return res.status(404).json({ message: MESSAGES.ERROR.USER_NOT_FOUND });

        // Step 2: Get company DB
        const companyDB = mongoose.connection.useDb(CompanyCode);

        // Step 3: Get or register Cheque model
        const ChequeModel = companyDB.models.Cheque || companyDB.model("Cheque", ChequesSchema);

        // Step 4: Fetch all cheques
        const cheques = await ChequeModel.find();

        res.status(200).json({ cheques });
    } catch (error) {
        console.error("FetchCheque Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export { FetchCheque };
