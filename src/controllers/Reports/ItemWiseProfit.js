import mongoose from "mongoose";
import ItemsSchema from "../../models/Item.js"; // Use your schema file
import MESSAGES from "../../config/messages.js";

export const getAllItemsNetProfitOrLoss = async (req, res) => {
  try {

    const companyCode = req.user["companyCode"];

    const companyDB = mongoose.connection.useDb(companyCode);
    const Item = companyDB.models.Item || companyDB.model("Items", ItemsSchema);

    const allItems = await Item.find();

    if (!allItems.length) {
      return res.status(404).json({ message: MESSAGES.ERROR.ITEM_NOT_FOUND });
    }

    const itemProfits = allItems.map(item => {
      if (!item.Payment || !Array.isArray(item.Payment)) {
        return {
          itemId: item._id,
          itemName: item.ItemName || "Unnamed",
          totalNetProfit: 0,
          note: "No Payment records found"
        };
      }

      let totalRevenue = 0;
      let totalSalesQty = 0;
      let totalCostFIFO = 0;
      let remainingSalesQty = 0;
      let deficitCost = 0;
      let purchaseList = [];

      // Step 1: Calculate total revenue and quantity sold
      item.Payment.forEach(payment => {
        if (["SaleInvoice"].includes(payment.Type)) {
          const qty = payment.Qty || 0;
          const price = payment.Price || 0;

          totalRevenue += qty * price;
          totalSalesQty += qty;
        }
      });

      // Step 2: Create sorted FIFO purchase list
      item.Payment.forEach(payment => {
        if (["Opening Stock", "PurchaseBill"].includes(payment.Type)) {
          purchaseList.push({
            Qty: payment.Qty,
            PurchasePrice: payment.Price,
            Date: payment.Date
          });
        }
      });

      purchaseList.sort((a, b) => new Date(a.Date) - new Date(b.Date));

      // Step 3: Match purchases to sales using FIFO
      remainingSalesQty = totalSalesQty;
      let totalWeightedPrice = 0;
      let totalWeightedQty = 0;

      for (const purchase of purchaseList) {
        totalWeightedPrice += purchase.Qty * purchase.PurchasePrice;
        totalWeightedQty += purchase.Qty;

        if (remainingSalesQty <= 0) break;

        const usedQty = Math.min(remainingSalesQty, purchase.Qty);
        const costAdded = usedQty * purchase.PurchasePrice;

        totalCostFIFO += costAdded;
        remainingSalesQty -= usedQty;
        purchase.Qty -= usedQty;
      }

      // Step 4: Handle deficit (sales without matching purchase)
      if (remainingSalesQty > 0) {
        let remainingQty = remainingSalesQty;
        let tempDeficitCost = 0;

        const salesPayments = item.Payment
          .filter(payment => ["SaleInvoice"].includes(payment.Type))
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        for (const payment of salesPayments) {
          if (remainingQty <= 0) break;

          const qtyDeficit = Math.min(remainingQty, payment.Qty || 0);
          const salePrice = payment.Price || 0;
          const cost = qtyDeficit * salePrice;

          tempDeficitCost += cost;
          remainingQty -= qtyDeficit;
        }

        deficitCost = tempDeficitCost;
      }

      // Step 5: Final Profit Calculation
      const actualSalesQty = totalSalesQty - remainingSalesQty;
      const weightedAvgSalePrice = actualSalesQty > 0 ? totalRevenue / actualSalesQty : 0;
      const weightedAvgPurchasePrice = totalWeightedQty > 0 ? totalWeightedPrice / totalWeightedQty : 0;
      const netProfitPerUnit = weightedAvgSalePrice - weightedAvgPurchasePrice;
      const totalNetProfit = netProfitPerUnit * actualSalesQty - deficitCost;

      return {
        itemId: item._id,
        itemName: item.ItemName || "Unnamed",
        totalNetProfit: parseFloat(totalNetProfit.toFixed(2)),
        totalRevenue: parseFloat(totalRevenue.toFixed(2)),
        totalSalesQty,
        totalCostFIFO: parseFloat(totalCostFIFO.toFixed(2)),
        deficitCost: parseFloat(deficitCost.toFixed(2)),
        weightedAvgSalePrice: parseFloat(weightedAvgSalePrice.toFixed(2)),
        weightedAvgPurchasePrice: parseFloat(weightedAvgPurchasePrice.toFixed(2)),
        netProfitPerUnit: parseFloat(netProfitPerUnit.toFixed(2))
      };
    });

    res.status(200).json(itemProfits);
  } catch (error) {
    console.error("❌ Error in getAllItemsNetProfitOrLoss:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};
