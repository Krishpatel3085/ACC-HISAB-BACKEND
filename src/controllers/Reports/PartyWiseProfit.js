import PartiesSchema from "../../models/Party.js";
import ItemsSchema from "../../models/Item.js";
import mongoose from "mongoose";

export const getAllPartiesNetProfitOrLoss = async (req, res) => {
    try {
        const companyCode = req.user["companyCode"];

        const companyDB = mongoose.connection.useDb(companyCode);
        const Party = companyDB.models.Party || companyDB.model("Party", PartiesSchema);
        const Item = companyDB.models.Item || companyDB.model("Items", ItemsSchema);

        const allParties = await Party.find();

        const result = [];

        for (const party of allParties) {
            let totalRevenue = 0;
            let totalCost = 0;
            let totalPayableTax = 0;

            if (!party.Payment || !Array.isArray(party.Payment)) {
                result.push({
                    partyId: party._id,
                    partyName: party.PartyName || "Unnamed",
                    netProfitOrLoss: 0,
                    note: "No payments found"
                });
                continue;
            }

            const saleInvoices = party.Payment.filter(p => p.Type === "SaleInvoice");
            if (saleInvoices.length === 0) {
                result.push({
                    partyId: party._id,
                    partyName: party.PartyName || "Unnamed",
                    netProfitOrLoss: 0,
                    note: "No SaleInvoice transactions"
                });
                continue;
            }

            // Step 1: Collect item names sold
            const itemNames = [...new Set(
                saleInvoices.flatMap(p => (p.Items || []).map(i => i.ItemName))
            )];

            const itemsData = await Item.find({ ItemName: { $in: itemNames } }).lean();

            const stockData = {};

            for (const item of itemsData) {
                for (const payment of item.Payment) {
                    const itemName = payment.ItemName;
                    const qty = payment.Qty || 0;
                    const price = payment.Price || 0;

                    if (!stockData[itemName]) {
                        stockData[itemName] = {
                            totalPurchaseQty: 0,
                            totalPurchaseValue: 0,
                            totalSalesQty: 0,
                            salesInvoices: []
                        };
                    }

                    stockData[itemName].totalPurchaseQty += qty;
                    stockData[itemName].totalPurchaseValue += qty * price;
                }
            }


            // Step 2: Loop through sale invoices
            for (const payment of saleInvoices) {
                totalPayableTax += payment.TaxAmount || 0;

                for (const item of payment.Items || []) {
                    totalRevenue += (item.Quantity || 0) * (item.PriceUnite || 0);
                    if (!stockData[item.ItemName]) {
                        stockData[item.ItemName] = {
                            totalPurchaseQty: 0,
                            totalPurchaseValue: 0,
                            totalSalesQty: 0,
                            salesInvoices: []
                        };
                    }

                    stockData[item.ItemName].totalSalesQty += item.Quantity || 0;
                    stockData[item.ItemName].salesInvoices.push({
                        qty: item.Quantity || 0,
                        price: item.PriceUnite || 0
                    });
                }
            }

            // Step 3: Calculate COGS
            for (const itemName in stockData) {
                const item = stockData[itemName];

                let availableStockQty = item.totalPurchaseQty;
                let totalCostForItem = 0;

                // Weighted average purchase price
                const weightedPurchasePrice =
                    item.totalPurchaseQty > 0
                        ? item.totalPurchaseValue / item.totalPurchaseQty
                        : 0;

                for (const sale of item.salesInvoices) {
                    const qty = sale.qty;
                    const salePrice = sale.price;

                    if (availableStockQty >= qty) {
                        // Enough stock available
                        totalCostForItem += qty * weightedPurchasePrice;
                        availableStockQty -= qty;
                    } else {
                        // Partial or no stock: split cost
                        const availableQty = Math.max(availableStockQty, 0);
                        const negativeQty = qty - availableQty;

                        if (availableQty > 0) {
                            totalCostForItem += availableQty * weightedPurchasePrice;
                        }

                        if (negativeQty > 0) {
                            totalCostForItem += negativeQty * salePrice;
                        }

                        availableStockQty = 0;
                    }
                }

                totalCost += totalCostForItem;
            }

            const netProfitOrLoss = totalRevenue - (totalCost + totalPayableTax);

            result.push({
                partyId: party._id,
                partyName: party.PartyName || "Unnamed",
                netProfitOrLoss: parseFloat(netProfitOrLoss.toFixed(2)),
                totalRevenue,
                totalCost: parseFloat(totalCost.toFixed(2)),
                totalPayableTax: parseFloat(totalPayableTax.toFixed(2))
            });
        }

        return res.status(200).json(result);
    } catch (error) {
        console.error("❌ Error in getAllPartiesNetProfitOrLoss:", error);
        return res.status(500).json({
            message: "Something went wrong",
            error: error.message
        });
    }
};
