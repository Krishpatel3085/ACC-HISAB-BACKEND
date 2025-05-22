import getCompanyModels from "../../utils/getCompanyModels.js";

export const getProfitAndLoss = async (req, res) => {
    try {
        const companyCode = req.user.companyCode;
        const {
            PaymentIn,
            SaleInvoice,
            Expense,
            Item
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

        // 2. Expense Section using Payments inside Item
        const items = await Item.find().lean();

        let totalPurchaseQty = 0;
        let totalPurchaseValue = 0;
        let totalSalesQty = 0;
        let availableStockQty = 0;

        // 2.1 Loop through each item to accumulate purchases & sales
        items.forEach((item) => {
            const payments = item.Payment || []; // You named it `Payment` not `Payments`
            payments.forEach((pay) => {
                const qty = pay.Qty || 0;
                const price = pay.Price || 0;
                const type = pay.Type;

                if (["Opening Stock", "PurchaseBill"].includes(type)) {
                    totalPurchaseQty += qty;
                    totalPurchaseValue += qty * price;
                    availableStockQty += qty;
                }

                if (["SaleInvoice", "SaleOrder"].includes(type)) {
                    totalSalesQty += qty;
                }
            });
        });

        // 2.2 Calculate Weighted Avg Price
        const weightedPrice = totalPurchaseQty > 0 ? totalPurchaseValue / totalPurchaseQty : 0;

        // 2.3 Cost of available stock sales
        const usedStockQty = Math.min(totalSalesQty, availableStockQty);
        let availableStockCost = usedStockQty * weightedPrice;

        // 2.4 Cost for negative stock (fallback to sale prices)
        let negativeStockQty = totalSalesQty - availableStockQty;
        let negativeStockCost = 0;

        if (negativeStockQty > 0) {
            items.forEach((item) => {
                const sales = (item.Payment || [])
                    .filter(p => ["SaleInvoice", "SaleOrder"].includes(p.Type))
                    .reverse();

                for (let sale of sales) {
                    if (negativeStockQty <= 0) break;

                    const saleQty = sale.Qty || 0;
                    const salePrice = sale.Price || 0;

                    const usedQty = Math.min(negativeStockQty, saleQty);
                    negativeStockCost += usedQty * salePrice;
                    negativeStockQty -= usedQty;
                }
            });
        }

        const totalItemCost = availableStockCost + negativeStockCost;

        // 3. Extra Expenses from Expense Collection
        const allExpenses = await Expense.find().lean();
        const expenseCategories = {};
        let otherExpensesTotal = 0;

        allExpenses.forEach((exp) => {
            if (!expenseCategories[exp.CategoryName]) {
                expenseCategories[exp.CategoryName] = 0;
            }
            expenseCategories[exp.CategoryName] += exp.Amount || 0;
            otherExpensesTotal += exp.Amount || 0;
        });

        // 4. Final Response
        res.status(200).json({
            income: {
                paymentIn: paymentInTotal,
                saleInvoice: saleInvoiceTotal,
                netIncome: paymentInTotal + saleInvoiceTotal,
            },
            expense: {
                itemCost: totalItemCost,
                expenseCategories,
                netExpense: totalItemCost + otherExpensesTotal,
            },
        });
    } catch (error) {
        console.error("Profit & Loss Error: ", error);
        res.status(500).json({ message: "Internal Server Error", error });
    }
};
