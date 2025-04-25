
import mongoose from "mongoose";
import OnlineOrderSchema from "../models/OnlineOrder.js";
import MESSAGES from "../config/messages.js";
import getCompanyModels from "../utils/getCompanyModels.js";

// Global Model (Main DB)
const OnlineOrder = mongoose.models.OnlineOrder || mongoose.model("OnlineOrder", OnlineOrderSchema);

const createOnlineOrder = async (req, res) => {
    try {
        const OnlineOrderData = req.body;
        const lastOrder = await OnlineOrder.findOne().sort({ createdAt: -1 });

        let newOrderNo = "ORD#ON001";
        if (lastOrder?.OrderNo) {
            const lastNumber = parseInt(lastOrder.OrderNo.replace("ORD#ON", ""), 10);
            newOrderNo = `ORD#ON${(lastNumber + 1).toString().padStart(3, "0")}`;
        }

        const onlineOrder = new OnlineOrder({ ...OnlineOrderData, OrderNo: newOrderNo });
        await onlineOrder.save();

        res.status(201).json({ message: MESSAGES.SUCCESS.ONLINE_ORDER, newOrderNo });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getAllOnlineOrders = async (req, res) => {
    try {
        const orders = await OnlineOrder.find().sort({ createdAt: -1 });
        if (!orders.length) return res.status(404).json({ error: "No orders found" });
        res.status(200).json({ message: MESSAGES.SUCCESS.ALL_ORDER, orders });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getOnlineOrderById = async (req, res) => {
    try {
        const { id } = req.params;
        const order = await OnlineOrder.findOne({ $or: [{ _id: id }, { OrderNo: id }] });
        if (!order) return res.status(404).json({ message: MESSAGES.ERROR.ORDER_NOT_FOUND });
        res.status(200).json({ message: MESSAGES.SUCCESS.ORDER_FETCH, order });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const convertSaleinvoiceO = async (req, res) => {
    try {
        const SaleInvoiceData = req.body;
        console.log("SaleInvoiceDataforOnlineOrder", SaleInvoiceData);

        const companyCode = req.user?.companyCode;
        console.log("CompanyCode is required", companyCode);

        if (!companyCode) return res.status(400).json({ message: MESSAGES.ERROR.COMPANY_CODE_REQUIRED });

        const { SaleInvoice, Parties, Cash, Cheques, BankAccount } = await getCompanyModels(companyCode);

        const {
            Total = 0,
            Balance = 0,
            PaidAmount = 0,
            PaymentType = "",
            ChequeNumber,
            PartyName,
            Date,
        } = SaleInvoiceData;
        console.log("Testing hania is loyal or not", SaleInvoiceData);


        const status = Balance === 0 ? "Paid" : PaidAmount > 0 ? "Partial" : "Unpaid";
        const InvoiceNo = `SI${Math.floor(10000 + Math.random() * 90000)}`;
        const TranscationType = "SaleInvoice";

        const saleInvoice = new SaleInvoice({ ...SaleInvoiceData, InvoiceNo, Status: status, TranscationType, companyCode });

        // Validate party
        const party = await Parties.findOne({ PartyName });
        if (!party) return res.status(404).json({ message: MESSAGES.ERROR.PARTY_NOT_FOUND });

        party.Payment.push({
            InvoiceNo,
            Total,
            Balance,
            PaymentType,
            Type: "SaleInvoice",
            PaidAmount,
            PartyName,
            Status: status,
            Date,
        });
        await party.save();

        // Handle payment methods
        if (PaymentType === "Cash") {
            let cashAccount = await Cash.findOne();
            if (!cashAccount) {
                cashAccount = new Cash({
                    Adjustment: "Initial",
                    Amount: 0,
                    AsOfDate: new Date().toISOString(),
                    Description: "Cash Account Initialized",
                    Payment: [],
                });
            }
            cashAccount.Payment.push({
                InvoiceNo,
                Total,
                Balance,
                PaymentType,
                Type: "SaleInvoice",
                PaidAmount,
                PartyName,
                Date,
            });
            await cashAccount.save();
        } else if (PaymentType === "Cheque") {
            if (!ChequeNumber) {
                return res.status(400).json({ message: MESSAGES.ERROR.CHEQUE_NUMBER_REQUIRED });
            }
            if (Balance !== 0) {
                return res.status(400).json({ message: MESSAGES.ERROR.CHEQUE_AMOUNT_REQUIRED });
            }
            const cheque = new Cheques({
                InvoiceNo,
                Total,
                PaymentType,
                Type: "SaleInvoice",
                PartyName,
                ChequeNumber,
                Date,
            });
            await cheque.save();
        } else {
            const bank = await BankAccount.findOne({ AccountDisplayName: PaymentType });
            if (!bank) return res.status(404).json({ message: MESSAGES.ERROR.BANK_ACCOUNT_NOT_FOUND });

            bank.Payment.push({
                InvoiceNo,
                Total,
                Balance,
                PaymentType,
                Type: "SaleInvoice",
                PaidAmount,
                PartyName,
                Date,
            });
            await bank.save();
        }


        const onlineOrder = await OnlineOrder.findOne({ OrderNo: SaleInvoiceData.OrderNo });

        if (!onlineOrder) return res.status(404).json({ message: MESSAGES.ERROR.ORDER_NOT_FOUND });

        onlineOrder.InvoiceNo = InvoiceNo;
        onlineOrder.Status = "Accepted";
        await onlineOrder.save();
        await saleInvoice.save();

        res.status(201).json({ message: MESSAGES.SUCCESS.SALE_INVOICE_CREATED });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const cancelOnlineOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const onlineOrder = await OnlineOrder.findById(id);
        if (!onlineOrder) return res.status(404).json({ error: "Order not found" });

        onlineOrder.Status = "Cancelled";
        await onlineOrder.save();

        res.status(200).json({ message: "Order cancelled successfully", order: onlineOrder });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export {
    createOnlineOrder,
    getAllOnlineOrders,
    getOnlineOrderById,
    cancelOnlineOrder,
    convertSaleinvoiceO,
}