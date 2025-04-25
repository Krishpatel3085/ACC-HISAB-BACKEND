import MESSAGES from "../config/messages.js";
import getCompanyModels from "../utils/getCompanyModels.js";

const createExpense = async (req, res) => {
    try {
        const ExpenseData = req.body;
        const { companyCode } = req.user;

        const { Expense, Cash, BankAccount, Cheques } = await getCompanyModels(companyCode);

        const total = ExpenseData.Amount || 0;
        const balance = ExpenseData.Balance || 0;
        const paidAmount = ExpenseData.PaidAmount || 0;

        let status = "Unpaid";
        if (balance === 0) status = "Paid";
        else if (balance > 0 && paidAmount > 0) status = "Partial";

        const InvoiceNo = `EX${Math.floor(10000 + Math.random() * 90000)}`;

        const expense = new Expense({ ...ExpenseData, Status: status, InvoiceNo });

        if (expense.PaymentType === "Cash") {
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
                Total: total,
                Balance: balance,
                PaymentType: "Cash",
                Type: "Expense",
                PaidAmount: paidAmount,
                PartyName: expense.PartyName,
                Date: expense.Date
            });

            await cashAccount.save();

        } else if (expense.PaymentType === "Cheque") {
            if (!ExpenseData.ChequeNumber) {
                return res.status(400).json({ message: MESSAGES.ERROR.CHEQUE_NUMBER_REQUIRED });
            }

            if (total) {
                const cheque = new Cheques({
                    InvoiceNo,
                    Total: total,
                    PaymentType: "Cheque",
                    Type: "Expense",
                    PartyName: expense.PartyName,
                    ChequeNumber: ExpenseData.ChequeNumber,
                    Date: expense.Date
                });
                await cheque.save();
            } else {
                return res.status(400).json({ message: MESSAGES.ERROR.CHEQUE_AMOUNT_REQUIRED });
            }

        } else {
            const bank = await BankAccount.findOne({ AccountDisplayName: expense.PaymentType });
            if (!bank) return res.status(404).json({ message: MESSAGES.ERROR.BANK_ACCOUNT_NOT_FOUND });

            bank.Payment.push({
                InvoiceNo,
                Total: total,
                Balance: balance,
                PaymentType: expense.PaymentType,
                Type: "Expense",
                PaidAmount: paidAmount,
                PartyName: expense.PartyName,
                Date: expense.Date
            });
            await bank.save();
        }

        await expense.save();
        res.status(201).json({ message: MESSAGES.SUCCESS.EXPENSE_CREATED, companyCode });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const FetchExpense = async (req, res) => {
    try {
        const { companyCode } = req.user;
        const { Expense } = await getCompanyModels(companyCode);
        const Expenses = await Expense.find();
        res.status(200).json({ Expenses });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const updateExpense = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        console.log("updateData", updateData);
        
        const CompanyCode = req.user["companyCode"];

        // Step 1: Get Models using useComDBModel
        const { Expense, BankAccount, Cash, Cheques } = await getCompanyModels(CompanyCode);

        // Step 2: Fetch existing expense
        const existingExpense = await Expense.findById(id);
        if (!existingExpense) return res.status(404).json({ message: MESSAGES.ERROR.EXPENSE_NOT_FOUND });

        const {
            Amount: newAmount = 0,
            Balance: newBalance = 0,
            PaidAmount: newPaidAmount = 0,
            PaymentType: newPaymentType,
            ChequeNumber,
            PartyName,
            Date
        } = updateData;

        // Step 3: Determine updated status
        let newStatus = "Unpaid";
        if (newBalance === 0) newStatus = "Paid";
        else if (newBalance > 0 && newPaidAmount > 0) newStatus = "Partial";

        updateData.Status = newStatus;

        // Step 4: Remove from old payment records
        const invoiceNo = existingExpense.InvoiceNo;

        if (existingExpense.PaymentType === "Cash") {
            const cash = await Cash.findOne();
            if (cash) {
                cash.Payment = cash.Payment.filter(p => p.InvoiceNo !== invoiceNo);
                await cash.save();
            }
        } else if (existingExpense.PaymentType === "Cheque") {
            await Cheques.deleteOne({ InvoiceNo: invoiceNo });
        } else {
            const oldBank = await BankAccount.findOne({ AccountDisplayName: existingExpense.PaymentType });
            if (oldBank) {
                oldBank.Payment = oldBank.Payment.filter(p => p.InvoiceNo !== invoiceNo);
                await oldBank.save();
            }
        }

        // Step 5: Add to new payment records
        if (newPaymentType === "Cash") {
            let cash = await Cash.findOne();
            if (!cash) {
                cash = new Cash({
                    Adjustment: "Initial",
                    Amount: 0,
                    AsOfDate: new Date().toISOString(),
                    Description: "Cash Account Initialized",
                    Payment: []
                });
            }

            const newCashPayment = {
                InvoiceNo: invoiceNo,
                Total: newAmount,
                Balance: newBalance,
                PaymentType: "Cash",
                Type: "Expense",
                PaidAmount: newPaidAmount,
                PartyName,
                Date
            };

            cash.Payment.push(newCashPayment);
            await cash.save();
        } else if (newPaymentType === "Cheque") {
            if (!ChequeNumber) {
                return res.status(400).json({ message: MESSAGES.ERROR.CHEQUE_NUMBER_REQUIRED });
            }

            if (newAmount) {
                const newCheque = new Cheques({
                    InvoiceNo: invoiceNo,
                    Total: newAmount,
                    PaymentType: "Cheque",
                    Type: "Expense",
                    PartyName,
                    ChequeNumber,
                    Date
                });
                await newCheque.save();
            } else {
                return res.status(400).json({ message: MESSAGES.ERROR.CHEQUE_AMOUNT_REQUIRED });
            }
        } else {
            const newBank = await BankAccount.findOne({ AccountDisplayName: newPaymentType });
            if (!newBank) return res.status(404).json({ message: MESSAGES.ERROR.BANK_ACCOUNT_NOT_FOUND });

            const newBankPayment = {
                InvoiceNo: invoiceNo,
                Total: newAmount,
                Balance: newBalance,
                PaymentType: newPaymentType,
                Type: "Expense",
                PaidAmount: newPaidAmount,
                PartyName,
                Date
            };

            newBank.Payment.push(newBankPayment);
            await newBank.save();
        }

        // Step 6: Update Expense Record
        const updatedExpense = await Expense.findByIdAndUpdate(id, updateData, { new: true });
        res.status(200).json({ message: MESSAGES.SUCCESS.EXPENSE_UPDATED , updatedExpense });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


const deleteExpense = async (req, res) => {
    try {
        const { id } = req.params;
        const { companyCode } = req.user;

        const { Expense } = await getCompanyModels(companyCode);
        const deletedExpense = await Expense.findByIdAndDelete(id);

        if (!deletedExpense) return res.status(404).json({ message: MESSAGES.ERROR.EXPENSE_NOT_FOUND });
        res.status(200).json({ message: MESSAGES.SUCCESS.EXPENSE_DELETED });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export { createExpense, FetchExpense, updateExpense, deleteExpense };
