import getCompanyModels from "../../utils/getCompanyModels.js";

export const getProfitAndLoss = async (req, res) => {
    try {
        const companyCode = req.user.companyCode;
        const {
            PaymentIn,
            SaleInvoice,
            SaleOrder,
            Expense,
        } = await getCompanyModels(companyCode);

        // 1. Income Section
        const paymentInData = await PaymentIn.find().lean();
        const saleInvoices = await SaleInvoice.find().lean();

        let paymentInTotal = 0;
        let saleInvoiceTotal = 0;

        paymentInData.forEach((payment) => {
            paymentInTotal += payment.Amount || 0;
        });

        saleInvoices.forEach((invoice) => {
            invoice.Items.forEach((item) => {
                saleInvoiceTotal += (item.Quantity || 0) * (item.PriceUnite || 0);
            });
        });

        // 2. Expense Section - Item Cost
        const allSales = [
            ...saleInvoices.map(item => ({ ...item, Type: "SaleInvoice" })),
            ...(await SaleOrder.find().lean()).map(item => ({ ...item, Type: "SaleOrder" })),
        ];

        let totalCost = 0;
        let totalSalesQty = 0;
        let totalPurchaseQty = 0;
        let totalPurchaseValue = 0;
        let availableStockQty = 0;
        let remainingNegativeQty = 0;
        let negativeStockCost = 0;

        const payments = await Expense.find().lean();
        const allPayments = [...payments];

        // Collect stock from Opening Stock and Purchase Bills
        allPayments.forEach((payment) => {
            if (["Opening Stock", "PurchaseBill"].includes(payment.Type)) {
                availableStockQty += payment.Qty || 0;
                totalPurchaseQty += payment.Qty || 0;
                totalPurchaseValue += (payment.Qty || 0) * (payment.Price || 0);
            }
        });

        // Collect Sale Qty
        const salesInvoices = [];
        allSales.forEach((sale) => {
            totalSalesQty += sale.Qty || 0;
            salesInvoices.push(sale);
        });

        // Calculate Weighted Average Purchase Price
        let weightedPurchasePrice = totalPurchaseQty > 0 ? totalPurchaseValue / totalPurchaseQty : 0;

        let adjustedSalesQty = Math.min(totalSalesQty, availableStockQty);
        let availableStockCost = adjustedSalesQty * weightedPurchasePrice;

        remainingNegativeQty = totalSalesQty - availableStockQty;
        if (remainingNegativeQty > 0) {
            for (let i = salesInvoices.length - 1; i >= 0; i--) {
                let invoice = salesInvoices[i];
                let qty = invoice.Qty || 0;
                if (remainingNegativeQty <= qty) {
                    negativeStockCost += remainingNegativeQty * invoice.Price;
                    break;
                } else {
                    negativeStockCost += qty * invoice.Price;
                    remainingNegativeQty -= qty;
                }
            }
        }

        totalCost = availableStockCost + negativeStockCost;

        // 3. Expense Category Breakdown
        const allExpenses = await Expense.find().lean();
        const categoryWiseExpense = {};
        let totalExpenseCategoryAmount = 0;

        allExpenses.forEach((exp) => {
            if (!categoryWiseExpense[exp.CategoryName]) {
                categoryWiseExpense[exp.CategoryName] = 0;
            }
            categoryWiseExpense[exp.CategoryName] += exp.Amount || 0;
            totalExpenseCategoryAmount += exp.Amount || 0;
        });

        // Final Response
        res.status(200).json({
            income: {
                paymentIn: paymentInTotal,
                saleInvoice: saleInvoiceTotal,
                netIncome: paymentInTotal + saleInvoiceTotal,
            },
            expense: {
                itemCost: totalCost,
                expenseCategories: categoryWiseExpense,
                netExpense: totalCost + totalExpenseCategoryAmount,
            },
        });
    } catch (error) {
        console.error("Profit & Loss Calculation Error: ", error);
        res.status(500).json({ message: "Internal Server Error", error });
    }
};
