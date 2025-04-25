import getCompanyDB from "./getCompanyDB.js";
import PaymentInSchema from "../models/PaymentIn.js";
import PartiesSchema from "../models/Party.js";
import BankAccountSchema from "../models/BankAccount.js";
import CashInHandSchema from "../models/CashInHand.js";
import ChequesSchema from "../models/Cheque.js";
import PaymentOutSchema from "../models/Paymentout.js";
import ExpenseSchema from "../models/Expense.js";
import PurchaseBillSchema from "../models/PurchaseBill.js";
import GSTSchema from "../models/GST.js";
import ItemsSchema from "../models/Item.js";
import PurchaseReturnSchema from "../models/PurchaseReturn.js";
import SaleInvoiceSchema from "../models/SaleInvoice.js";
import SaleReturnSchema from "../models/SaleReturn.js";
import SaleOrderSchema from "../models/SaleOrder.js";
import WhatSappchema from "../models/WhatSappMessage.js";


const getCompanyModels = async (companyCode) => {
    const companyDB = await getCompanyDB(companyCode);

    return {
        PaymentIn: companyDB.models.PaymentIn || companyDB.model("PaymentIn", PaymentInSchema),
        PaymentOut: companyDB.models.PaymentOut || companyDB.model("PaymentOut", PaymentOutSchema),
        Parties: companyDB.models.Parties || companyDB.model("Parties", PartiesSchema),
        BankAccount: companyDB.models.Bankaccounts || companyDB.model("Bankaccounts", BankAccountSchema),
        Cash: companyDB.models.Cash || companyDB.model("Cash", CashInHandSchema),
        Cheques: companyDB.models.Cheques || companyDB.model("Cheques", ChequesSchema),
        Expense: companyDB.models.Expense || companyDB.model("Expense", ExpenseSchema),
        GST: companyDB.models.GST || companyDB.model("GST", GSTSchema),
        Item: companyDB.models.Item || companyDB.model("Item", ItemsSchema),
        PurchaseBill: companyDB.models.PurchaseBill || companyDB.model("PurchaseBill", PurchaseBillSchema),
        PurchaseReturn: companyDB.models.PurchaseReturn || companyDB.model("PurchaseReturn", PurchaseReturnSchema),
        SaleInvoice: companyDB.models.SaleInvoice || companyDB.model("SaleInvoice", SaleInvoiceSchema),
        SaleReturn: companyDB.models.SaleReturn || companyDB.model("SaleReturn", SaleReturnSchema),
        SaleOrder: companyDB.models.SaleOrder || companyDB.model("SaleOrder", SaleOrderSchema),
        WhatsAppMessage: companyDB.models.WhatsAppMessage || companyDB.model("WhatsAppMessage", WhatSappchema),
        db: companyDB,
    };
};

export default getCompanyModels;
