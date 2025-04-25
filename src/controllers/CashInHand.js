import mongoose from "mongoose";
import CashInHandSchema from "../models/CashInHand.js";
import Master from "../models/MasterDB.js";
import MESSAGES from "../config/messages.js";

// ✅ Utility: Get company-specific DB and model
const getCashModel = async (companyCode) => {
    const user = await Master.findOne({ companyCode });
    if (!user) throw new Error(MESSAGES.ERROR.USER_NOT_FOUND);

    const db = mongoose.connection.useDb(user.companyCode);
    return db.models.Cash || db.model("Cash", CashInHandSchema);
};

// ✅ Create CashInHand Entry
const createCashInHand = async (req, res) => {
    try {
        const { Adjustment, AsOfDate, Amount, Description } = req.body;
        const companyCode = req.user?.companyCode;
        if (!Adjustment || !AsOfDate || !Amount) {
            return res.status(400).json({ message: MESSAGES.ERROR.ALL_FIELDS_REQUIRED });
        }

        const CashInHandModel = await getCashModel(companyCode);
        let cashInHand = await CashInHandModel.findOne();

        if (!cashInHand) {
            // If no record exists, initialize
            cashInHand = new CashInHandModel({
                Adjustment,
                AsOfDate,
                Amount,
                Description,
                Payment: [],
            });
        }

        cashInHand.Payment.push({
            InvoiceNo: "",
            Total: Amount,
            Balance: 0,
            PaymentType: "Cash",
            Type: Adjustment,
            PaidAmount: Amount,
            PartyName: "",
            Date: AsOfDate,
        });

        await cashInHand.save();

        res.status(201).json({ message: MESSAGES.SUCCESS.CASH_IN_HAND_CREATED, companyCode });
    } catch (error) {
        res.status(500).json({ error: error.message || "Internal server error" });
    }
};

// ✅ Fetch All CashInHand Records
const FetchCashInHand = async (req, res) => {
    try {
        const companyCode = req.user?.companyCode;
        const CashInHandModel = await getCashModel(companyCode);
        const cashInHandRecords = await CashInHandModel.find();

        res.status(200).json({ cashInHandRecords });
    } catch (error) {
        res.status(500).json({ error: error.message || "Failed to fetch records" });
    }
};

// ✅ Update CashInHand by ID
const updateCashInHand = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        const companyCode = req.user?.companyCode;

        const CashInHandModel = await getCashModel(companyCode);
        const existingRecord = await CashInHandModel.findById(id);

        if (!existingRecord) {
            return res.status(404).json({ message: MESSAGES.ERROR.RECORD_NOT_FOUND });
        }

        const updatedRecord = await CashInHandModel.findByIdAndUpdate(id, updateData, { new: true });
        res.status(200).json({ message: MESSAGES.SUCCESS.CASH_IN_HAND_UPDATED, updatedRecord });
    } catch (error) {
        res.status(500).json({ error: error.message || "Failed to update record" });
    }
};

// ✅ Delete CashInHand by ID
const deleteCashInHand = async (req, res) => {
    try {
        const { id } = req.params;
        const companyCode = req.user?.companyCode;

        const CashInHandModel = await getCashModel(companyCode);
        const existingRecord = await CashInHandModel.findById(id);

        if (!existingRecord) {
            return res.status(404).json({ message: MESSAGES.ERROR.RECORD_NOT_FOUND });
        }

        await CashInHandModel.findByIdAndDelete(id);
        res.status(200).json({ message: MESSAGES.SUCCESS.CASH_IN_HAND_DELETED });
    } catch (error) {
        res.status(500).json({ error: error.message || "Failed to delete record" });
    }
};

export {
    createCashInHand,
    FetchCashInHand,
    updateCashInHand,
    deleteCashInHand,
};
