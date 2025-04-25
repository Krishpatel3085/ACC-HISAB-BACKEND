import mongoose from "mongoose";
import BankAccountSchema from "../models/BankAccount.js";
import Master from "../models/MasterDB.js";
import MESSAGES from "../config/messages.js";

// Helper: Get company-specific DB and model
const getCompanyModel = async (companyCode, modelName, schema) => {
    const user = await Master.findOne({ companyCode });
    if (!user) throw new Error(MESSAGES.ERROR.COMPANY_NOT_FOUND);

    const companyDB = mongoose.connection.useDb(user.companyCode);
    return companyDB.models[modelName] || companyDB.model(modelName, schema);
};

// CREATE Bank Account
const createBankAccount = async (req, res) => {
    try {
        const { companyCode } = req.user;
        const data = req.body;

        if (!data.AccountHolderName || !data.AccountNumber) {
            return res.status(400).json({ message: MESSAGES.ERROR.ACCOUNT_HOLDER_NAME_ACCOUNTNUMBER_REQUIRED });
        }

        const BankAccountModel = await getCompanyModel(companyCode, "BankAccount", BankAccountSchema);
        const bankAccount = new BankAccountModel(data);
        await bankAccount.save();

        res.status(201).json({ message: MESSAGES.SUCCESS.BANK_ACCOUNT_CREATED, bankAccount });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// FETCH Bank Accounts
const FetchBankAccount = async (req, res) => {
    try {
        const { companyCode } = req.user;

        const BankAccountModel = await getCompanyModel(companyCode, "BankAccount", BankAccountSchema);
        const bankAccounts = await BankAccountModel.find();

        res.status(200).json({ bankAccounts });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// UPDATE Bank Account
const updateBankAccount = async (req, res) => {
    try {
        const { id } = req.params;
        const { companyCode } = req.user;
        const updateData = req.body;

        const BankAccountModel = await getCompanyModel(companyCode, "BankAccount", BankAccountSchema);
        const updated = await BankAccountModel.findByIdAndUpdate(id, updateData, { new: true });

        if (!updated) return res.status(404).json({ message: MESSAGES.ERROR.BANK_ACCOUNT_NOT_FOUND });

        res.status(200).json({ message: MESSAGES.SUCCESS.BANK_ACCOUNT_UPDATED, updatedRecord: updated });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// DELETE Bank Account
const deleteBankAccount = async (req, res) => {
    try {
        const { id } = req.params;
        const { companyCode } = req.user;

        const BankAccountModel = await getCompanyModel(companyCode, "BankAccount", BankAccountSchema);
        const deleted = await BankAccountModel.findByIdAndDelete(id);

        if (!deleted) return res.status(404).json({ message: MESSAGES.ERROR.BANK_ACCOUNT_NOT_FOUND });

        res.status(200).json({ message: MESSAGES.SUCCESS.BANK_ACCOUNT_DELETED, deletedRecord: deleted });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export {
    createBankAccount,
    FetchBankAccount,
    updateBankAccount,
    deleteBankAccount,
};
