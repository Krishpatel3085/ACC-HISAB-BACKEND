import getCompanyModels from "../utils/getCompanyModels.js";
import MESSAGES from "../config/messages.js";
import moment from "moment";


const Salerevanue = async (req, res) => {
    try {
        const companyCode = req.user.companyCode;
        const { SaleInvoice } = await getCompanyModels(companyCode);

        const allInvoices = await SaleInvoice.find();

        // Total Sale Amount
        const totalSaleAmount = allInvoices.reduce((acc, invoice) => acc + (invoice.Total || 0), 0);

        // Today's Date Range
        const startOfToday = moment().startOf('day').toDate();
        const endOfToday = moment().endOf('day').toDate();

        const todayInvoices = await SaleInvoice.find({
            createdAt: { $gte: startOfToday, $lte: endOfToday }
        });

        const todaySaleAmount = todayInvoices.reduce((acc, invoice) => acc + (invoice.Total || 0), 0);

        // Yesterday's Date Range
        const startOfYesterday = moment().subtract(1, 'day').startOf('day').toDate();
        const endOfYesterday = moment().subtract(1, 'day').endOf('day').toDate();

        const yesterdayInvoices = await SaleInvoice.find({
            createdAt: { $gte: startOfYesterday, $lte: endOfYesterday }
        });

        const yesterdaySaleAmount = yesterdayInvoices.reduce((acc, invoice) => acc + (invoice.Total || 0), 0);

        // Percentage Change Calculation
        let percentageChange = 0;
        if (yesterdaySaleAmount > 0) {
            percentageChange = ((todaySaleAmount - yesterdaySaleAmount) / yesterdaySaleAmount) * 100;
        } else if (todaySaleAmount > 0) {
            percentageChange = 100; // 100% increase from zero
        }

        res.status(200).json({
            success: true,
            message: MESSAGES.SUCCESS.FETCH_SUCCESS,
            data: {
                totalSaleAmount,
                todaySaleAmount,
                yesterdaySaleAmount,
                percentageChange: Number(percentageChange.toFixed(2)), // rounded to 2 decimals
            }
        });
    } catch (error) {
        console.error("Sale Revenue Error:", error);
        res.status(500).json({
            success: false,
            message: MESSAGES.ERROR.SERVER_ERROR,
            error: error.message,
        });
    }
};

const getIncomeExpenseSummary = async (req, res) => {
    try {
        const companyCode = req.user.companyCode;
        const {
            PaymentIn,
            SaleInvoice,
            Expense,
            Item,
        } = await getCompanyModels(companyCode);

        const today = moment().startOf('day');
        const yesterday = moment().subtract(1, 'day').startOf('day');
        const tomorrow = moment().add(1, 'day').startOf('day');

        // Helper to get total amount in date range
        const getTotalAmount = async (Model, field = 'Total', dateField = 'createdAt', startDate, endDate) => {
            const data = await Model.find({
                [dateField]: { $gte: startDate.toDate(), $lt: endDate.toDate() }
            });
            return data.reduce((sum, doc) => sum + (doc[field] || 0), 0);
        };

        // === INCOME ===
        const todayIncome = await getTotalAmount(PaymentIn, 'Total', 'createdAt', today, tomorrow)
            + await getTotalAmount(SaleInvoice, 'Total', 'createdAt', today, tomorrow);

        const yesterdayIncome = await getTotalAmount(PaymentIn, 'Total', 'createdAt', yesterday, today)
            + await getTotalAmount(SaleInvoice, 'Total', 'createdAt', yesterday, today);

        const totalIncome = await PaymentIn.aggregate([
            { $group: { _id: null, total: { $sum: "$Total" } } }
        ]).then(res => res[0]?.total || 0) +
            await SaleInvoice.aggregate([
                { $group: { _id: null, total: { $sum: "$Total" } } }
            ]).then(res => res[0]?.total || 0);

        // === EXPENSE ===
        const todayExpense = await getTotalAmount(Expense, 'Amount', 'createdAt', today, tomorrow);
        const yesterdayExpense = await getTotalAmount(Expense, 'Amount', 'createdAt', yesterday, today);

        const totalExpenseAmount = await Expense.aggregate([
            { $group: { _id: null, total: { $sum: "$Amount" } } }
        ]).then(res => res[0]?.total || 0);

        // === ITEM COST ===
        const items = await Item.find(); // assumes Payment is inside each item
        let totalItemCost = 0;

        for (const item of items) {
            totalItemCost += await calculateItemCost(item);
        }

        const totalExpense = totalExpenseAmount + totalItemCost;

        const incomePercent = calculatePercentage(todayIncome, yesterdayIncome);
        const expensePercent = calculatePercentage(todayExpense, yesterdayExpense);

        // === RESPONSE ===
        res.status(200).json({
            success: true,
            message: MESSAGES.FETCH_SUCCESS,
            data: {
                income: {
                    total: totalIncome,
                    today: todayIncome,
                    yesterday: yesterdayIncome,
                    percentChange: incomePercent,
                },
                expense: {
                    total: totalExpense,
                    today: todayExpense,
                    yesterday: yesterdayExpense,
                    percentChange: expensePercent,
                }
            }
        });
    } catch (error) {
        console.error("Income/Expense Summary Error:", error);
        res.status(500).json({
            success: false,
            message: MESSAGES.SERVER_ERROR,
            error: error.message,
        });
    }
};

// === Helper: Calculate total item cost ===
const calculateItemCost = async (item) => {
    if (!item.Payment || !Array.isArray(item.Payment)) return 0;

    let totalCost = 0;
    let totalSalesQty = 0;
    let totalPurchaseQty = 0;
    let totalPurchaseValue = 0;
    let availableStockQty = 0;
    let remainingNegativeQty = 0;
    let negativeStockCost = 0;

    let salesInvoices = [];

    item.Payment.forEach(payment => {
        if (["Opening Stock", "PurchaseBill"].includes(payment.Type)) {
            availableStockQty += payment.Qty || 0;
            totalPurchaseQty += payment.Qty || 0;
            totalPurchaseValue += (payment.Qty || 0) * (payment.Price || 0);
        }

        if (["SaleInvoice", "SaleOrder"].includes(payment.Type)) {
            totalSalesQty += payment.Qty || 0;
            salesInvoices.push(payment);
        }
    });

    let weightedPurchasePrice = totalPurchaseQty > 0 ? totalPurchaseValue / totalPurchaseQty : 0;
    let adjustedSalesQty = Math.min(totalSalesQty, availableStockQty);
    let availableStockCost = adjustedSalesQty * weightedPurchasePrice;

    remainingNegativeQty = totalSalesQty - availableStockQty;
    if (remainingNegativeQty > 0) {
        for (let i = salesInvoices.length - 1; i >= 0; i--) {
            const saleInvoice = salesInvoices[i];
            let saleQty = saleInvoice.Qty || 0;

            if (remainingNegativeQty <= saleQty) {
                negativeStockCost += remainingNegativeQty * saleInvoice.Price;
                break;
            } else {
                negativeStockCost += saleQty * saleInvoice.Price;
                remainingNegativeQty -= saleQty;
            }
        }
    }

    totalCost = availableStockCost + negativeStockCost;
    return totalCost;
};

// === Helper: Percentage Calculation ===
const calculatePercentage = (today, yesterday) => {
    if (yesterday === 0) return today === 0 ? 0 : 100;
    return ((today - yesterday) / yesterday) * 100;
};



const getSaleMonthlyYearlySummary = async (req, res) => {
    try {
        const companyCode = req.user.companyCode;
        const { month, year } = req.query;

        const { SaleInvoice, SaleReturn } = await getCompanyModels(companyCode);

        const now = new Date();
        const selectedMonth = parseInt(month) || now.getMonth() + 1;
        const selectedYear = parseInt(year) || now.getFullYear();

        const monthNames = [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ];

        // 1️⃣ Monthly Summary
        const startOfMonth = new Date(selectedYear, selectedMonth - 1, 1);
        const endOfMonth = new Date(selectedYear, selectedMonth, 0, 23, 59, 59);

        const monthlySaleInvoice = await SaleInvoice.aggregate([
            {
                $match: {
                    createdAt: { $gte: startOfMonth, $lte: endOfMonth }
                }
            },
            {
                $group: {
                    _id: null,
                    totalAmount: { $sum: "$Total" }
                }
            }
        ]);

        const monthlySaleReturn = await SaleReturn.aggregate([
            {
                $match: {
                    createdAt: { $gte: startOfMonth, $lte: endOfMonth }
                }
            },
            {
                $group: {
                    _id: null,
                    totalAmount: { $sum: "$Total" }
                }
            }
        ]);



        // 2️⃣ Yearly Summary (Group by year/month for chart)
        const invoiceData = await SaleInvoice.aggregate([
            {
                $group: {
                    _id: {
                        year: { $year: "$createdAt" },
                        month: { $month: "$createdAt" },
                    },
                    totalAmount: { $sum: "$Total" }
                }
            }
        ]);

        const returnData = await SaleReturn.aggregate([
            {
                $group: {
                    _id: {
                        year: { $year: "$createdAt" },
                        month: { $month: "$createdAt" },
                    },
                    totalAmount: { $sum: "$Total" }
                }
            }
        ]);

        const summaryMap = new Map();

        invoiceData.forEach(({ _id, totalAmount }) => {
            const key = `${_id.year}-${_id.month}`;
            summaryMap.set(key, {
                year: _id.year,
                month: _id.month,
                saleInvoiceAmount: totalAmount,
                saleReturnAmount: 0
            });
        });

        returnData.forEach(({ _id, totalAmount }) => {
            const key = `${_id.year}-${_id.month}`;
            if (summaryMap.has(key)) {
                summaryMap.get(key).saleReturnAmount = totalAmount;
            } else {
                summaryMap.set(key, {
                    year: _id.year,
                    month: _id.month,
                    saleInvoiceAmount: 0,
                    saleReturnAmount: totalAmount
                });
            }
        });

        const result = {};
        for (let value of summaryMap.values()) {
            const { year, month, saleInvoiceAmount, saleReturnAmount } = value;
            if (!result[year]) result[year] = [];
            result[year].push({
                month: monthNames[month - 1],
                saleInvoiceAmount,
                saleReturnAmount
            });
        }

        const finalData = Object.keys(result).map(year => ({
            year: Number(year),
            months: result[year].sort(
                (a, b) => monthNames.indexOf(a.month) - monthNames.indexOf(b.month)
            )
        }));

        // 3️⃣ Daily Data Summary
        const dailySaleInvoice = await SaleInvoice.aggregate([
            {
                $match: {
                    createdAt: { $gte: startOfMonth, $lte: endOfMonth }
                }
            },
            {
                $group: {
                    _id: { day: { $dayOfMonth: "$createdAt" } },
                    totalAmount: { $sum: "$Total" }
                }
            }
        ]);

        const dailySaleReturn = await SaleReturn.aggregate([
            {
                $match: {
                    createdAt: { $gte: startOfMonth, $lte: endOfMonth }
                }
            },
            {
                $group: {
                    _id: { day: { $dayOfMonth: "$createdAt" } },
                    totalAmount: { $sum: "$Total" }
                }
            }
        ]);

        const dailySummary = {};

        dailySaleInvoice.forEach(({ _id, totalAmount }) => {
            const day = _id.day;
            if (!dailySummary[day]) {
                dailySummary[day] = { saleInvoiceAmount: 0, saleReturnAmount: 0 };
            }
            dailySummary[day].saleInvoiceAmount = totalAmount;
        });

        dailySaleReturn.forEach(({ _id, totalAmount }) => {
            const day = _id.day;
            if (!dailySummary[day]) {
                dailySummary[day] = { saleInvoiceAmount: 0, saleReturnAmount: 0 };
            }
            dailySummary[day].saleReturnAmount = totalAmount;
        });


        const monthlyData = {
            year: selectedYear,
            month: monthNames[selectedMonth - 1],
            saleInvoiceAmount: monthlySaleInvoice[0]?.totalAmount || 0,
            saleReturnAmount: monthlySaleReturn[0]?.totalAmount || 0,
            dailySummary
        };
        res.status(200).json({
            success: true,
            message: MESSAGES.FETCH_SUCCESS,
            currentMonthData: monthlyData,
            yearlySummary: finalData,
        });

    } catch (error) {
        console.error("Monthly/Yearly Sale Summary Error:", error);
        res.status(500).json({
            success: false,
            message: MESSAGES.SERVER_ERROR,
            error: error.message
        });
    }
};




export { Salerevanue, getIncomeExpenseSummary, getSaleMonthlyYearlySummary };
