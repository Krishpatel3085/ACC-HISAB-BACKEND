import mongoose from "mongoose";
import ItemsSchema from "../../models/Item.js"; // Use your schema file


export const getAllItemsNetProfitOrLoss = async (req, res) => {
  try {
    const companyCode = req.user["companyCode"];

    const companyDB = mongoose.connection.useDb(companyCode);
    const Item = companyDB.models.Item || companyDB.model("Items", ItemsSchema);

    const allItems = await Item.find();


    if (!allItems.length) {
      return res.status(404).json({ message: "No items found" });
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

      // ➕ Extra Totals from Schema Keys
      let SaleInvoiceAmount = 0;
      let SaleReturnAmount = 0;
      let PurchaseBillAmount = 0;
      let PurchaseReturnAmount = 0;
      let TaxReceivable = 0;
      let TaxPayable = 0;

      item.Payment.forEach(payment => {
        const {
          Type,
          Qty = 0,
          Price = 0,
          TaxAmount = 0,
          Items = [],
          Date
        } = payment;

        switch (Type) {
          case "SaleInvoice":
            TaxReceivable += TaxAmount;
            Items.forEach(itemEntry => {
              if (itemEntry.ItemName === item.ItemName) {
                const { Quantity, PriceUnite } = itemEntry;
                totalRevenue += Quantity * PriceUnite;
                totalSalesQty += Quantity;
                SaleInvoiceAmount += Quantity * PriceUnite
              }
            });
            break;

          case "SaleReturn":
            Items.forEach(itemEntry => {
              if (itemEntry.ItemName === item.ItemName) {
                const { Quantity, PriceUnite } = itemEntry;
                SaleReturnAmount += Quantity * PriceUnite
              }
            });
            break;

          case "PurchaseBill":
            TaxPayable += TaxAmount;
            purchaseList.push({ Qty, PurchasePrice: Price, Date });
            Items.forEach(itemEntry => {
              if (itemEntry.ItemName === item.ItemName) {
                const { Quantity, PriceUnite } = itemEntry;
                PurchaseBillAmount += Quantity * PriceUnite
              }
            });
            break;

          case "PurchaseReturn":
            Items.forEach(itemEntry => {
              if (itemEntry.ItemName === item.ItemName) {
                const { Quantity, PriceUnite } = itemEntry;
                PurchaseReturnAmount += Quantity * PriceUnite
              }
            });
            break;

          case "Opening Stock":
            purchaseList.push({ Qty, PurchasePrice: Price, Date });
            break;
        }
      });

      // FIFO Costing
      purchaseList.sort((a, b) => new Date(a.Date) - new Date(b.Date));

      remainingSalesQty = totalSalesQty;
      let totalWeightedPrice = 0;
      let totalWeightedQty = 0;

      for (const purchase of purchaseList) {
        totalWeightedPrice += purchase.Qty * purchase.PurchasePrice;
        totalWeightedQty += purchase.Qty;

        if (remainingSalesQty <= 0) break;

        let usedQty = Math.min(remainingSalesQty, purchase.Qty);
        let costAdded = usedQty * purchase.PurchasePrice;

        totalCostFIFO += costAdded;
        remainingSalesQty -= usedQty;
        purchase.Qty -= usedQty;
      }

      // Deficit Cost Handling
      if (remainingSalesQty > 0) {
        let remainingQty = remainingSalesQty;
        let tempDeficitCost = 0;

        const salesPayments = item.Payment
          .filter(p => ["SaleInvoice"].includes(p.Type))
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        for (const payment of salesPayments) {
          if (remainingQty <= 0) break;

          let qtyDeficit = Math.min(remainingQty, payment.Qty);
          let cost = qtyDeficit * payment.Price;

          tempDeficitCost += cost;
          remainingQty -= qtyDeficit;
        }

        deficitCost = tempDeficitCost;
      }

      // const actualSalesQty = totalSalesQty - remainingSalesQty;
      const actualSalesQty = totalSalesQty;
      const weightedAvgSalePrice = actualSalesQty > 0 ? totalRevenue / actualSalesQty : 0;
      const weightedAvgPurchasePrice = totalWeightedQty > 0 ? totalWeightedPrice / totalWeightedQty : 0;

      // const netProfitPerUnit = weightedAvgSalePrice - weightedAvgPurchasePrice;


      const totalNetProfit = totalRevenue - totalCostFIFO - deficitCost;
      const netProfitPerUnit = actualSalesQty > 0 ? totalNetProfit / actualSalesQty : 0;

      // const totalNetProfit = netProfitPerUnit * actualSalesQty - deficitCost;

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
        netProfitPerUnit: parseFloat(netProfitPerUnit.toFixed(2)),

        // Matched Schema Keys Totals
        SaleInvoiceAmount: parseFloat(SaleInvoiceAmount.toFixed(2)),
        SaleReturnAmount: parseFloat(SaleReturnAmount.toFixed(2)),
        PurchaseBillAmount: parseFloat(PurchaseBillAmount.toFixed(2)),
        PurchaseReturnAmount: parseFloat(PurchaseReturnAmount.toFixed(2)),
        TaxReceivable: parseFloat(TaxReceivable.toFixed(2)),
        TaxPayable: parseFloat(TaxPayable.toFixed(2))
      };
    });

    res.status(200).json(itemProfits);
  } catch (error) {
    console.error("❌ Error in getAllItemsNetProfitOrLoss:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};
