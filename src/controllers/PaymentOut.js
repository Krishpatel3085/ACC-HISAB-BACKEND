import MESSAGES from "../config/messages.js";
import getCompanyModels from "../utils/getCompanyModels.js";

const createPaymentOut = async (req, res) => {
    try {
        const {
            PartyName,
            PaymentType,
            Date,
            Recived,
            Discount,
            Description,
            Total,
            ReceiptNo,
            ChequeNumber
        } = req.body;

        const companyCode = req.user["companyCode"];
        const {
            PaymentOut,
            Parties,
            BankAccount,
            Cash,
            Cheques
        } = await getCompanyModels(companyCode);

        // Validate required fields
        if (!PartyName) {
            return res.status(400).json({ message: MESSAGES.ERROR.PARTY_NAME_REQUIRED });
        }

        const total = Total || 0;
        const paidAmount = Recived || 0;
        const balance = total - paidAmount;
        const InvoiceNo = `PI${Math.floor(10000 + Math.random() * 90000)}`;

        let status;
        if (balance === 0) status = "Paid";
        else if (balance > 0 && paidAmount > 0) status = "Partial";
        else status = "Unpaid";

        const newPayment = new PaymentOut({
            InvoiceNo,
            PartyName,
            PaymentType,
            Date,
            Recived,
            Discount,
            Description,
            Total,
            ReceiptNo,
            ChequeNumber,
            Status: status
        });

        // Update Party Payment
        const party = await Parties.findOne({ PartyName });
        if (!party) return res.status(404).json({ message: MESSAGES.ERROR.PARTY_NOT_FOUND });

        party.Payment.push({
            InvoiceNo,
            Total: 0,
            Balance: balance,
            PaymentType,
            Type: "PaymentOut",
            PaidAmount: total,
            PartyName,
            Status: status,
            Date
        });
        await party.save();

        // Handle Payment Types
        if (PaymentType.toLowerCase() === "cash") {
            let cashAccount = await Cash.findOne();
            if (!cashAccount) {
                cashAccount = new Cash({
                    Adjustment: "Initial",
                    Amount: 0,
                    AsOfDate: new Date().toISOString(),
                    Description: "Cash Account Initialized",
                    Payment: []
                });
            }

            cashAccount.Payment.push({
                InvoiceNo,
                Total: 0,
                Balance: balance,
                PaymentType: "Cash",
                Type: "PaymentOut",
                PaidAmount: total,
                PartyName,
                Date
            });
            await cashAccount.save();

        } else if (PaymentType === "Cheque") {
            if (!ChequeNumber) {
                return res.status(400).json({ message: MESSAGES.ERROR.CHEQUE_NUMBER_REQUIRED });
            }

            if (total !== Recived) {
                return res.status(400).json({ message: MESSAGES.ERROR.CHEQUE_AMOUNT_REQUIRED });
            }

            const cheque = new Cheques({
                InvoiceNo,
                Total: total,
                PaymentType: "Cheque",
                Type: "PaymentOut",
                PartyName,
                ChequeNumber,
                Date
            });
            await cheque.save();

        } else {
            const bank = await BankAccount.findOne({ AccountDisplayName: PaymentType });
            if (!bank) return res.status(404).json({ message: MESSAGES.ERROR.BANK_ACCOUNT_NOT_FOUND });

            bank.Payment.push({
                InvoiceNo,
                Total: 0,
                Balance: balance,
                PaymentType,
                Type: "PaymentOut",
                PaidAmount: total,
                PartyName,
                Date
            });
            await bank.save();
        }

        await newPayment.save();
        res.status(201).json({ message: MESSAGES.SUCCESS.PAYMENTOUT_CREATED, companyCode });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};

const updatePaymentOut = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            PartyName,
            PaymentType,
            Date,
            Recived,
            Discount,
            Description,
            Total,
            ReceiptNo,
            ChequeNumber
        } = req.body;
        console.log("updatePaymentOut", req.body);

        const companyCode = req.user["companyCode"];
        const {
            PaymentOut,
            Parties,
            BankAccount,
            Cash,
            Cheques
        } = await getCompanyModels(companyCode);

        // Fetch the old payment record
        const oldPayment = await PaymentOut.findById(id);
        if (!oldPayment) return res.status(404).json({ message: MESSAGES.ERROR.PARTY_NOT_FOUND });

        const total = Total || 0;
        const paidAmount = Recived || 0;
        const balance = total - paidAmount;

        let status;
        if (balance === 0) status = "Paid";
        else if (balance > 0 && paidAmount > 0) status = "Partial";
        else status = "Unpaid";

        const updateFields = {
            PartyName,
            PaymentType,
            Date,
            Recived: paidAmount,
            Discount,
            Description,
            Total: total,
            ReceiptNo,
            ChequeNumber,
            Status: status
        };

        // Update main PaymentOut record
        const updatedPayment = await PaymentOut.findByIdAndUpdate(id, updateFields, { new: true });

        // === Update Party Payments ===
        const party = await Parties.findOne({ PartyName });
        if (party) {
            // Remove old InvoiceNo entry
            party.Payment = party.Payment.filter(p => p.InvoiceNo !== oldPayment.InvoiceNo);

            // Push updated data
            party.Payment.push({
                InvoiceNo: updatedPayment.InvoiceNo,
                Total: 0,
                Balance: balance,
                PaymentType,
                Type: "Payment-Out",
                PaidAmount: total,
                PartyName,
                Status: status,
                Date
            });

            await party.save();
        }

        // === Update Payment Type Logic ===

        // Remove old payment from Cheques, Cash, or BankAccount
        if (oldPayment.PaymentType === "Cheque") {
            await Cheques.deleteOne({ InvoiceNo: oldPayment.InvoiceNo });
        } else if (oldPayment.PaymentType === "Cash") {
            const cashAccount = await Cash.findOne();
            if (cashAccount) {
                cashAccount.Payment = cashAccount.Payment.filter(p => p.InvoiceNo !== oldPayment.InvoiceNo);
                await cashAccount.save();
            }
        } else {
            const oldBank = await BankAccount.findOne({ AccountDisplayName: oldPayment.PaymentType });
            if (oldBank) {
                oldBank.Payment = oldBank.Payment.filter(p => p.InvoiceNo !== oldPayment.InvoiceNo);
                await oldBank.save();
            }
        }

        // Now add new payment to the correct place
        if (PaymentType.toLowerCase() === "cash") {
            let cashAccount = await Cash.findOne();
            if (!cashAccount) {
                cashAccount = new Cash({
                    Adjustment: "Initial",
                    Amount: 0,
                    AsOfDate: new Date().toISOString(),
                    Description: "Cash Account Initialized",
                    Payment: []
                });
            }

            cashAccount.Payment.push({
                InvoiceNo: updatedPayment.InvoiceNo,
                Total: 0,
                Balance: balance,
                PaymentType: "Cash",
                Type: "Payment-Out",
                PaidAmount: total,
                PartyName,
                Date
            });

            await cashAccount.save();

        } else if (PaymentType === "Cheque") {
            if (!ChequeNumber) {
                return res.status(400).json({ message: MESSAGES.ERROR.CHEQUE_NUMBER_REQUIRED });
            }

            if (total !== Recived) {
                return res.status(400).json({ message: MESSAGES.ERROR.CHEQUE_AMOUNT_REQUIRED });
            }

            const cheque = new Cheques({
                InvoiceNo: updatedPayment.InvoiceNo,
                Total: total,
                PaymentType: "Cheque",
                Type: "Payment-Out",
                PartyName,
                ChequeNumber,
                Date
            });

            await cheque.save();

        } else {
            const bank = await BankAccount.findOne({ AccountDisplayName: PaymentType });
            if (!bank) return res.status(404).json({ message: MESSAGES.ERROR.BANK_ACCOUNT_NOT_FOUND });

            bank.Payment.push({
                InvoiceNo: updatedPayment.InvoiceNo,
                Total: 0,
                Balance: balance,
                PaymentType,
                Type: "Payment-Out",
                PaidAmount: total,
                PartyName,
                Date
            });

            await bank.save();
        }

        res.status(200).json({ message: MESSAGES.SUCCESS.PAYMENTOUT_UPDATED, updatedPayment });

    } catch (error) {
        console.error("Error updating payment:", error);
        res.status(500).json({ error: error.message });
    }
};

const FetchPaymentOut = async (req, res) => {
    try {
        const companyCode = req.user["companyCode"];
        const { PaymentOut } = await getCompanyModels(companyCode);

        const payments = await PaymentOut.find().sort({ createdAt: -1 });
        res.status(200).json(payments);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const deletePaymentOut = async (req, res) => {
    try {
        const { id } = req.params;
        const companyCode = req.user["companyCode"];
        const { PaymentOut } = await getCompanyModels(companyCode);

        const deletedPayment = await PaymentOut.findByIdAndDelete(id);
        if (!deletedPayment) {
            return res.status(404).json({ message: MESSAGES.ERROR.RECORD_NOT_FOUND });
        }

        res.status(200).json({ message: MESSAGES.SUCCESS.PAYMENTOUT_DELETED, deletedPayment });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


export { createPaymentOut, FetchPaymentOut, updatePaymentOut, deletePaymentOut };
