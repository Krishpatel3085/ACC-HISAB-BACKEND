import mongoose from "mongoose";
import PartiesSchema from "../models/Party.js";
import { verifyCompany } from "../config/Helper.js";
import MESSAGES from "../config/messages.js";

// Utility: Get Party Model based on companyCode
const getPartyModel = async (companyCode) => {
    const companyDB = mongoose.connection.useDb(companyCode);
    return companyDB.models.Parties || companyDB.model("Parties", PartiesSchema);
};


// Create Party
const createParty = async (req, res) => {
    try {
        const { PartyName, GstNo, PhoneNumber, GstType, State, EmailId, BillingAddress, ShippingAddress, Remark, Amount } = req.body;
        if (!PartyName) return res.status(400).json({message:MESSAGES.ERROR.PARTY_NAME_REQUIRED});

        const companyCode = await verifyCompany(req.user["companyCode"]);
        const PartyModel = await getPartyModel(companyCode);

        const newParty = new PartyModel({ PartyName, GstNo, PhoneNumber, GstType, State, EmailId, BillingAddress, ShippingAddress, Remark, Amount });
        await newParty.save();

        res.status(201).json({ message: MESSAGES.SUCCESS.PARTY_CREATED, party: newParty });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Fetch All Parties
const FetchParty = async (req, res) => {
    try {
        const companyCode = await verifyCompany(req.user["companyCode"]);
        const PartyModel = await getPartyModel(companyCode);

        const parties = await PartyModel.find();
        res.status(200).json({ parties });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Update Party
const updateParty = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        const companyCode = await verifyCompany(req.user["companyCode"]);
        const PartyModel = await getPartyModel(companyCode);

        const updatedParty = await PartyModel.findByIdAndUpdate(id, updateData, { new: true });
        if (!updatedParty) return res.status(404).json({ message: MESSAGES.ERROR.PARTY_NOT_FOUND });

        res.status(200).json({ message: MESSAGES.SUCCESS.PARTY_UPDATED, updatedParty });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Delete Party
const deleteParty = async (req, res) => {
    try {
        const { id } = req.params;

        const companyCode = await verifyCompany(req.user["companyCode"]);
        const PartyModel = await getPartyModel(companyCode);

        const deleted = await PartyModel.findByIdAndDelete(id);
        if (!deleted) return res.status(404).json({ message: MESSAGES.ERROR.PARTY_NOT_FOUND });

        res.status(200).json({ message: MESSAGES.SUCCESS.PARTY_DELETED });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Delete Specific Transaction From Party
const deleteTransaction = async (req, res) => {
    try {
        const { partyName, transactionType, date } = req.body;
        console.log(req.body);
        

        if (!partyName || !transactionType || !date)
            return res.status(400).json({message: MESSAGES.ERROR.PARTY_TRANSCTION_DATE_REQUIRED});

        const companyCode = await verifyCompany(req.user["companyCode"]);
        const PartyModel = await getPartyModel(companyCode);

        const party = await PartyModel.findOne({ PartyName: partyName });
        if (!party) return res.status(404).json({ message: MESSAGES.ERROR.PARTY_NOT_FOUND });

        party.Payment = (party.Payment || []).filter(
            (txn) => !(txn.Type === transactionType && txn.Date === date)
        );

        await party.save();
        res.status(200).json({ message:MESSAGES.SUCCESS.PARTY_TRANSACTION_DELETED , updatedParty: party });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export {
    createParty,
    FetchParty,
    updateParty,
    deleteParty,
    deleteTransaction
};
