import axios from "axios";
import Master from "../models/MasterDB.js";
import getCompanyModels from "../utils/getCompanyModels.js"; // adjust path as needed
import dotenv from 'dotenv';

dotenv.config();

const createWhatsappData = async (req, res) => {
    try {
        const {
            sendSMSToParty,
            sendTransactionUpdateSMS,
            partyCurrentBalanceInSMS,
            sales,
            purchase,
            paymentIn,
            paymentOut,
            whatsAppKey,
            instanceID,
        } = req.body;

        const companyCode = req.user.companyCode;
        const user = await Master.findOne({ companyCode });
        if (!user) return res.status(404).json({ error: "User not found" });

        const { WhatsAppMessage } = await getCompanyModels(companyCode);

        const newWhatsAppEntry = new WhatsAppMessage({
            WhatsAppKey: whatsAppKey,
            InstanceID: instanceID,
            SendSMSToParty: sendSMSToParty,
            SendTransactionUpdateSMS: sendTransactionUpdateSMS,
            PartyCurrentBalanceinSMS: partyCurrentBalanceInSMS,
            Sales: sales,
            Purchase: purchase,
            PaymentIn: paymentIn,
            PaymentOut: paymentOut
        });

        await newWhatsAppEntry.save();
        res.status(201).json({ message: "WhatsApp data created successfully", companyCode });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


const sendWhtasppMessage = async (req, res) => {
    try {
        const { partyname, date, message } = req.body;
        const companyCode = req.user.companyCode;

        const user = await Master.findOne({ companyCode });
        if (!user) return res.status(404).json({ error: "User not found" });

        const { Parties } = await getCompanyModels(companyCode);
        const party = await Parties.findOne({ PartyName: partyname });
        if (!party) return res.status(404).json({ error: "Party not found" });

        const mobileNumber = party.PhoneNumber;
        if (!mobileNumber) return res.status(400).json({ error: "Mobile number not found for the party" });

        const whatsappAPIUrl = `${process.env.WHATSAPP_API_URL}token=${process.env.WHATSAPP_TOKEN}&instance_id=${process.env.WHATSAPP_INSTANCE_ID}&jid=91${mobileNumber}@s.whatsapp.net&msg=${message}`;
        const response = await axios.get(whatsappAPIUrl);

        if (response.data.success) {
            res.status(200).json({ message: "WhatsApp message sent successfully", companyCode });
        } else {
            res.status(500).json({ error: "Failed to send WhatsApp message", details: response.data });
        }

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


const fetchWhatsappData = async (req, res) => {
    try {
        const companyCode = req.user.companyCode;

        const user = await Master.findOne({ companyCode });
        if (!user) return res.status(404).json({ error: "User not found" });

        const { WhatsAppMessage } = await getCompanyModels(companyCode);
        const whatsappConfig = await WhatsAppMessage.findOne();

        if (!whatsappConfig) {
            return res.status(404).json({ error: "WhatsApp configuration not found" });
        }

        res.status(200).json({
            message: "WhatsApp configuration fetched successfully",
            data: whatsappConfig,
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


const updateWhatsappData = async (req, res) => {
    try {
        const {
            sendSMSToParty,
            sendTransactionUpdateSMS,
            partyCurrentBalanceInSMS,
            sales,
            purchase,
            paymentIn,
            paymentOut,
            whatsAppKey,
            instanceID,
        } = req.body;

        const companyCode = req.user.companyCode;
        const user = await Master.findOne({ companyCode });
        if (!user) return res.status(404).json({ error: "User not found" });

        const { WhatsAppMessage } = await getCompanyModels(companyCode);

        const updatedWhatsAppEntry = await WhatsAppMessage.findOneAndUpdate(
            {},
            {
                WhatsAppKey: whatsAppKey,
                InstanceID: instanceID,
                SendSMSToParty: sendSMSToParty,
                SendTransactionUpdateSMS: sendTransactionUpdateSMS,
                PartyCurrentBalanceinSMS: partyCurrentBalanceInSMS,
                Sales: sales,
                Purchase: purchase,
                PaymentIn: paymentIn,
                PaymentOut: paymentOut
            },
            { new: true, upsert: true }
        );

        res.status(200).json({ message: "WhatsApp data updated successfully", data: updatedWhatsAppEntry });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


export {
    createWhatsappData,
    sendWhtasppMessage,
    fetchWhatsappData,
    updateWhatsappData
};
