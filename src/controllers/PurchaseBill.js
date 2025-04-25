import MESSAGES from "../config/messages.js";
import getCompanyModels from "../utils/getCompanyModels.js";
import PurchaseBillSchema from "../models/PurchaseBill.js";
import Master from "../models/MasterDB.js";
import mongoose from "mongoose";


const CreatePurchaseBill = async (req, res) => {
    try {
        const data = req.body;

        const companyCode = req.user.companyCode;

        const { PurchaseBill, GST, Parties, Cash, Cheques, BankAccount, Item } = await getCompanyModels(companyCode);

        const {
            PartyName,
            PhoneNumber,
            Date,
            State,
            PaymentType,
            RoundOff = 0,
            Shipping = 0,
            Adjustment = 0,
            Discount = 0,
            Total = 0,
            PaidAmount = 0,
            Balance = 0,
            Items = [],
            ChequeNumber,
            Tax,
        } = data;


        if (!PartyName || !PaymentType) {
            return res.status(400).json({ message: MESSAGES.ERROR.MISSING_FIELDS });
        }

        const Status = Balance === 0 ? "Paid" : PaidAmount > 0 ? "Partial" : "Unpaid";
        const InvoiceNo = `PB${Math.floor(10000 + Math.random() * 90000)}`;
        const TranscationType = "PurchaseBill";

        // Create PurchaseBill instance
        const purchaseBill = new PurchaseBill({
            PartyName,
            PhoneNumber,
            Date,
            State,
            TranscationType,
            PaymentType,
            RoundOff,
            Shipping,
            Adjustment,
            Discount,
            Total,
            PaidAmount,
            Balance,
            InvoiceNo,
            Status,
            companyCode,
            ChequeNumber,
            Items,
        });

        // Calculate GST
        const totalTaxAmount = Items.reduce((sum, i) => sum + (i.TaxAmount || 0), 0);
        const totalTaxRate = Items.reduce((sum, i) => sum + (i.TaxRate || 0), 0);

        const gstEntry = {
            Type: TranscationType,
            TaxAmount: totalTaxAmount,
            Amount: Total,
        };

        const gst = await GST.findOne({ TaxName: Tax });

        if (gst) {
            gst.Purchase.push(gstEntry);
            gst.markModified('Purchase');
            await gst.save();
        } else {
            await new GST({
                TaxName: Tax,
                TaxRate: totalTaxRate,
                TaxType: "GST",
                Purchase: [gstEntry],
            }).save();
        }

        // Add Party payment record
        const party = await Parties.findOne({ PartyName });
        if (!party) return res.status(404).json({ message: "Party not found" });

        const basePayment = {
            InvoiceNo,
            Total,
            Balance,
            PaymentType,
            Type: "PurchaseBill",
            PaidAmount,
            PartyName,
            Status,
            Date,
            TaxRate: totalTaxRate,
            TaxAmount: totalTaxAmount,
            Items,
        };

        party.Payment.push(basePayment);
        await party.save();

        // Payment type logic
        switch (PaymentType) {
            case "Cash": {
                let cash = await Cash.findOne();
                if (!cash) {
                    cash = new Cash({
                        Adjustment: "Initial",
                        Amount: 0,
                        AsOfDate: new Date(),
                        Description: "Cash account initialized",
                        Payment: [],
                    });
                }
                cash.Payment.push(basePayment);
                await cash.save();
                break;
            }
            case "Cheque": {
                if (!ChequeNumber) return res.status(400).json({ message: MESSAGES.ERROR.CHEQUE_NUMBER_REQUIRED });
                if (Balance !== 0) return res.status(400).json({ message: MESSAGES.ERROR.CHEQUE_AMOUNT_REQUIRED });

                const cheque = new Cheques({
                    InvoiceNo,
                    Total,
                    PaymentType,
                    Type: TranscationType,
                    PartyName,
                    ChequeNumber,
                    Date,
                });
                await cheque.save();
                break;
            }
            default: {
                const bank = await BankAccount.findOne({ AccountDisplayName: PaymentType });
                if (!bank) return res.status(404).json({ message: MESSAGES.ERROR.BANK_ACCOUNT_NOT_FOUND });

                bank.Payment.push(basePayment);
                await bank.save();
            }
        }

        // Update each item's stock
        for (const item of Items) {
            const existing = await Item.findOne({ ItemName: item.ItemName });
            if (!existing) return res.status(404).json({ message: `Item not found: ${item.ItemName}` });

            const itemEntry = {
                Type: "PurchaseBill",
                Qty: item.Quantity,
                Amount: Total,
                TaxAmount: totalTaxAmount,
                InvoiceNo,
            };

            existing.Quentity = Array.isArray(existing.Quentity)
                ? [...existing.Quentity, itemEntry]
                : [itemEntry];

            await existing.save();
        }

        // **Item inside add this entry**
        for (const item of Items) {
            const existingItem = await Item.findOne({ ItemName: item.ItemName });
            if (!existingItem) return res.status(404).json({ message: `Item not found: ${item.ItemName}` });

            const paymentEntry = {
                InvoiceNo,
                Total,
                Balance,
                PaymentType,
                Type: "PurchaseBill",
                PaidAmount,
                PartyName,
                Status,
                Date,
                TaxRate: totalTaxRate,
                TaxAmount: totalTaxAmount,
                Qty: item.Quantity,
                Price: item.PurchasePrice,
                ItemName: item.ItemName,
                PurchasePriceAtSale: item.PurchasePrice,
                ProfitLoss: 0, // Set 0 for purchase, as profit/loss is only for sale
                Items: [
                    {
                        ItemName: item.ItemName,
                        PurchasePrice: item.PurchasePrice,
                        Quantity: item.Quantity,
                        PriceUnite: item.PriceUnite,
                        TaxRate: item.TaxRate,
                        TaxAmount: item.TaxAmount,
                        Amount: item.Amount,
                        RoundOff: item.RoundOff,
                    }
                ],
            };

            existingItem.Payment.push(paymentEntry);
            await existingItem.save();
        }

        await purchaseBill.save();
        return res.status(201).json({ message: MESSAGES.SUCCESS.PURCHASE_BILL_CREATED, purchaseBill });

    } catch (error) {
        console.error("CreatePurchaseBill Error:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

const UpdatePurchaseBill = async (req, res) => {
    try {
        const companyCode = req.user.companyCode;
        const { id } = req.params;
        const data = req.body;

        const { PurchaseBill, GST, Parties, Cash, Cheques, BankAccount, Item } = await getCompanyModels(companyCode);

        const existingBill = await PurchaseBill.findById(id);
        if (!existingBill) {
            return res.status(404).json({ message: MESSAGES.ERROR.PURCHASE_BILL_NOT_FOUND });
        }

        const {
            PartyName,
            PhoneNumber,
            Date,
            State,
            PaymentType,
            RoundOff = 0,
            Shipping = 0,
            Adjustment = 0,
            Discount = 0,
            Total = 0,
            PaidAmount = 0,
            Balance = 0,
            Items = [],
            ChequeNumber,
            Tax = '',
        } = data;

        const Status = Balance === 0 ? "Paid" : PaidAmount > 0 ? "Partial" : "Unpaid";

        // Remove old GST record
        const oldGst = await GST.findOne({ TaxName: existingBill.Tax });
        if (oldGst) {
            oldGst.Purchase = oldGst.Purchase.filter(p => p.InvoiceNo !== existingBill.InvoiceNo);
            oldGst.markModified('Purchase');
            await oldGst.save();
        }

        // Remove previous Payment from Party
        const party = await Parties.findOne({ PartyName: existingBill.PartyName });
        if (party) {
            party.Payment = party.Payment.filter(p => p.InvoiceNo !== existingBill.InvoiceNo);
            await party.save();
        }

        // Remove old payment from Cash, Bank, or Cheque
        if (existingBill.PaymentType === "Cash") {
            const cash = await Cash.findOne();
            if (cash) {
                cash.Payment = cash.Payment.filter(p => p.InvoiceNo !== existingBill.InvoiceNo);
                await cash.save();
            }
        } else if (existingBill.PaymentType === "Cheque") {
            await Cheques.deleteOne({ InvoiceNo: existingBill.InvoiceNo });
        } else {
            const bank = await BankAccount.findOne({ AccountDisplayName: existingBill.PaymentType });
            if (bank) {
                bank.Payment = bank.Payment.filter(p => p.InvoiceNo !== existingBill.InvoiceNo);
                await bank.save();
            }
        }

        // Rollback inventory stock changes
        for (const item of existingBill.Items) {
            const dbItem = await Item.findOne({ ItemName: item.ItemName });
            if (dbItem) {
                dbItem.Quentity = dbItem.Quentity.filter(q => q.Type !== "PurchaseBill" || q.InvoiceNo !== existingBill.InvoiceNo);
                await dbItem.save();
            }
        }

        // === APPLY NEW VALUES ===

        // GST Update
        const totalTaxAmount = Items.reduce((sum, i) => sum + (i.TaxAmount || 0), 0);
        const totalTaxRate = Items.reduce((sum, i) => sum + (i.TaxRate || 0), 0);

        const gstEntry = {
            Type: "PurchaseBill",
            TaxAmount: totalTaxAmount,
            Amount: Total,
        };

        const gst = await GST.findOne({ TaxName: Tax });
        if (gst) {
            gst.Purchase.push(gstEntry);
            gst.markModified("Purchase");
            await gst.save();
        } else {
            await new GST({
                TaxName: Tax,
                TaxRate: totalTaxRate,
                TaxType: "Purchase",
                Purchase: [gstEntry],
            }).save();
        }

        // Update Party
        const updatedParty = await Parties.findOne({ PartyName });
        if (!updatedParty) {
            return res.status(404).json({ message: MESSAGES.ERROR.PARTY_NOT_FOUND });
        }

        const paymentRecord = {
            InvoiceNo: existingBill.InvoiceNo,
            Total,
            Balance,
            PaymentType,
            Type: "PurchaseBill",
            PaidAmount,
            PartyName,
            Status,
            Date,
            TaxRate: totalTaxRate,
            TaxAmount: totalTaxAmount,
            Items
        };

        updatedParty.Payment.push(paymentRecord);
        await updatedParty.save();

        // Handle PaymentType
        if (PaymentType === "Cash") {
            let cash = await Cash.findOne();
            if (!cash) {
                cash = new Cash({
                    Adjustment: "Initial",
                    Amount: 0,
                    AsOfDate: new Date(),
                    Description: "Cash Initialized",
                    Payment: [],
                });
            }
            cash.Payment.push(paymentRecord);
            await cash.save();

        } else if (PaymentType === "Cheque") {
            if (!ChequeNumber) {
                return res.status(400).json({ message: MESSAGES.ERROR.CHEQUE_NUMBER_REQUIRED });
            }
            if (Balance !== 0) {
                return res.status(400).json({ message: MESSAGES.ERROR.CHEQUE_AMOUNT_REQUIRED });
            }

            await new Cheques({
                InvoiceNo: existingBill.InvoiceNo,
                Total,
                PaymentType,
                Type: "PurchaseBill",
                PartyName,
                ChequeNumber,
                Date
            }).save();

        } else {
            const bank = await BankAccount.findOne({ AccountDisplayName: PaymentType });
            if (!bank) return res.status(404).json({ message: MESSAGES.ERROR.BANK_ACCOUNT_NOT_FOUND });

            bank.Payment.push(paymentRecord);
            await bank.save();
        }

        // Update Inventory
        for (const item of Items) {
            const dbItem = await Item.findOne({ ItemName: item.ItemName });
            if (dbItem) {
                if (!Array.isArray(dbItem.Quentity)) {
                    dbItem.Quentity = [];
                }

                const existingEntryIndex = dbItem.Quentity.findIndex(
                    q => q.Type === "PurchaseBill" && q.InvoiceNo === existingBill.InvoiceNo
                );

                const updatedEntry = {
                    Type: "PurchaseBill",
                    InvoiceNo: existingBill.InvoiceNo,
                    Qty: item.Quantity,
                    Amount: Total,
                    TaxAmount: totalTaxAmount,
                };

                if (existingEntryIndex !== -1) {
                    dbItem.Quentity[existingEntryIndex] = updatedEntry;
                } else {
                    dbItem.Quentity.push(updatedEntry);
                }

                // === Update Item Payment Entries ===
                const paymentEntry = {
                    InvoiceNo: existingBill.InvoiceNo,
                    Total,
                    Balance,
                    PaymentType,
                    Type: "PurchaseBill",
                    PaidAmount,
                    PartyName,
                    Status,
                    Date,
                    TaxRate: totalTaxRate,
                    TaxAmount: totalTaxAmount,
                    Qty: item.Quantity,
                    Price: item.PurchasePrice,
                    ItemName: item.ItemName,
                    PurchasePriceAtSale: item.PurchasePrice,
                    ProfitLoss: 0, // Set 0 for purchase, as profit/loss is only for sale
                    Items: [
                        {
                            ItemName: item.ItemName,
                            PurchasePrice: item.PurchasePrice,
                            Quantity: item.Quantity,
                            PriceUnite: item.PriceUnite,
                            TaxRate: item.TaxRate,
                            TaxAmount: item.TaxAmount,
                            Amount: item.Amount,
                            RoundOff: item.RoundOff,
                        }
                    ],
                };

                dbItem.Payment.push(paymentEntry);
                await dbItem.save();
            }
        }


        // Final PurchaseBill update
        existingBill.set({
            PartyName,
            PhoneNumber,
            Date,
            State,
            PaymentType,
            RoundOff,
            Shipping,
            Adjustment,
            Discount,
            Total,
            PaidAmount,
            Balance,
            Status,
            ChequeNumber,
            Items,
        });

        await existingBill.save();
        return res.status(200).json({ message: MESSAGES.SUCCESS.PURCHASE_BILL_UPDATED, purchaseBill: existingBill });

    } catch (error) {
        console.error("UpdatePurchaseBill Error:", error);
        return res.status(500).json({ message: "Server Error" });
    }
};

const GetPurchaseBills = async (req, res) => {
    try {
        const companyCode = req.user.companyCode;
        const { PurchaseBill } = await getCompanyModels(companyCode);

        const bills = await PurchaseBill.find();
        return res.status(200).json(bills);
    } catch (error) {
        console.error("GetPurchaseBills Error:", error);
        return res.status(500).json({ message: "Server Error" });
    }
};

const DeletePurchaseBill = async (req, res) => {
    try {
        const companyCode = req.user.companyCode;
        const { id } = req.params;

        const { PurchaseBill, Parties, Cash, BankAccount, Cheques, Item } = await getCompanyModels(companyCode);

        const bill = await PurchaseBill.findById(id);
        if (!bill) return res.status(404).json({ message: MESSAGES.ERROR.PURCHASE_BILL_NOT_FOUND });

        const { PartyName, PaymentType, InvoiceNo, Items } = bill;

        // 🔁 Remove from Party
        const party = await Parties.findOne({ PartyName });
        if (party) {
            party.Payment = party.Payment.filter(p => p.InvoiceNo !== InvoiceNo);
            await party.save();
        }

        // 💵 Remove from Payment source
        if (PaymentType === "Cash") {
            const cash = await Cash.findOne();
            if (cash) {
                cash.Payment = cash.Payment.filter(p => p.InvoiceNo !== InvoiceNo);
                await cash.save();
            }
        } else if (PaymentType === "Cheque") {
            await Cheques.deleteOne({ InvoiceNo });
        } else {
            const bank = await BankAccount.findOne({ AccountDisplayName: PaymentType });
            if (bank) {
                bank.Payment = bank.Payment.filter(p => p.InvoiceNo !== InvoiceNo);
                await bank.save();
            }
        }

        // 📦 Remove item quantities
        for (const item of Items) {
            const dbItem = await Item.findOne({ ItemName: item.ItemName });
            if (dbItem) {
                dbItem.Quentity = dbItem.Quentity.filter(q => q.Type !== "Purchase-Bill" || q.InvoiceNo !== InvoiceNo);
                await dbItem.save();
            }
        }

        // 🗑️ Delete Purchase Bill
        await bill.deleteOne();

        return res.status(200).json({ message: MESSAGES.SUCCESS.PURCHASE_BILL_DELETED });

    } catch (error) {
        console.error("DeletePurchaseBill Error:", error);
        return res.status(500).json({ message: "Server Error" });
    }
};

const FindPurchaseBill = async (req, res) => {
    try {
        const { id } = req.params;

        const companyCode = req.user.companyCode;

        if (!companyCode) {
            return res.status(400).json({ error: "Company code is missing in user info" });
        }

        // Validate if user exists in master DB
        const userExists = await Master.exists({ companyCode: companyCode });

        if (!userExists) {
            return res.status(404).json({ error: "User not found" });
        }

        // Connect to tenant DB and get PurchaseBill model
        const companyDB = mongoose.connection.useDb(companyCode);

        // logging("step4", companyDB);
        const PurchaseBill = companyDB.models.PurchaseBill || companyDB.model("PurchaseBill", PurchaseBillSchema);


        // Validate ID format
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: "Invalid Purchase Bill ID" });
        }

        // Fetch Purchase Bill
        const purchaseBill = await PurchaseBill.findById(id);

        if (!purchaseBill) {
            return res.status(404).json({ error: "Purchase Bill not found" });
        }

        return res.status(200).json({ purchaseBill });
    } catch (error) {
        console.error("Error in FindPurchaseBill:", error);
        return res.status(500).json({ error: "Server error. Please try again later." });
    }
};


export { CreatePurchaseBill, UpdatePurchaseBill, GetPurchaseBills, DeletePurchaseBill, FindPurchaseBill };