import mongoose from "mongoose";
import Master from "../models/MasterDB.js";
import MESSAGES from "../config/messages.js";
import ItemsSchema from "../models/Item.js";
import GSTSchema from "../models/GST.js";


const getCompanyDB = async (companyCode) => {
    if (!companyCode) throw new Error(MESSAGES.ERROR.COMPANY_CODE_REQUIRED);

    const user = await Master.findOne({ companyCode });
    if (!user) throw new Error(MESSAGES.ERROR.COMPANY_NOT_FOUND);

    const companyDB = mongoose.connection.useDb(companyCode);
    const ItemModel = companyDB.models.Item || companyDB.model("Items", ItemsSchema);
    const GSTModel = companyDB.models.GST || companyDB.model("GST", GSTSchema);

    return { ItemModel, GSTModel };
};

const createItem = async (req, res) => {
    try {
        const {
            itemName, category, itemCode, salePrice, discount,
            discountType, purchasePrice, taxName, taxRate,
            wholesalePrice, minWholesaleOrder, image, Stock
        } = req.body;


        const companyCode = req.user["companyCode"];
        if (!itemName) return res.status(400).json({ error: MESSAGES.ERROR.ITEMNAME_REQUIRED });

        const { ItemModel, GSTModel } = await getCompanyDB(companyCode);

        let base64Image = "";
        if (image) {
            if (!/^data:image\/[a-zA-Z]+;base64,/.test(image)) {
                return res.status(400).json({ error: MESSAGES.ERROR.INVALID_IMAGE_FORMAT });
            }
            base64Image = image;
        }

        const stockArray = Array.isArray(Stock) ? Stock.map(stock => ({
            OpeningQuentity: stock.OpeningQuentity,
            AtPrice: stock.AtPrice,
            AsOfDate: stock.AsOfDate,
            MinStockMaintain: stock.MinStockMaintain,
            Location: stock.Location
        })) : [];

        let totalOpeningTaxAmount = 0;
        let totalOpeningValue = 0;

        const openingPayments = stockArray.map(stock => {
            const qty = Number(stock.OpeningQuentity) || 0;
            const price = Number(purchasePrice) || 0;
            const rate = Number(taxRate) || 0;
            const taxAmt = (price * qty * (rate / 100));

            totalOpeningTaxAmount += taxAmt;
            totalOpeningValue += (price * qty);

            return {
                PaymentType: "Opening Stock",
                Type: "Opening Stock",
                Status: "Completed",
                Date: stock.AsOfDate || new Date(),
                Qty: qty,
                Price: price,
                TaxRate: rate,
                TaxAmount: taxAmt,
                ItemName: itemName
            };
        });
        const newItem = new ItemModel({
            ItemName: itemName,
            ItemCategory: category,
            ItemCode: itemCode,
            SalePrice: salePrice,
            Discount: discount,
            DiscountType: discountType,
            PurchasePrice: purchasePrice,
            Tax: taxName,
            TaxRate: taxRate,
            WholesalePrice: wholesalePrice,
            MinWholesaleOrder: minWholesaleOrder,
            Image: base64Image,
            Stock: stockArray,
            Payment: openingPayments
        });

        // 4. GST Logic - Opening Stock ને Purchase તરીકે ગણવું
        if (totalOpeningTaxAmount > 0) {
            const gstEntry = {
                Type: "Opening Stock",
                TaxAmount: totalOpeningTaxAmount,
                Amount: totalOpeningValue,
                Date: new Date()
            };

            // TaxName (e.g., "GST 18%") મુજબ શોધવું
            let gst = await GSTModel.findOne({ TaxName: taxName });

            if (gst) {
                gst.Purchase.push(gstEntry);
                gst.markModified('Purchase');
                await gst.save();
            } else {
                await new GSTModel({
                    TaxName: taxName,
                    TaxRate: taxRate,
                    TaxType: "GST",
                    Purchase: [gstEntry],
                }).save();
            }
        }

        await newItem.save();
        res.status(201).json({ message: MESSAGES.SUCCESS.ITEM_CREATED, companyCode });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const FetchItem = async (req, res) => {
    try {
        const companyCode = req.user["companyCode"];
        const { ItemModel } = await getCompanyDB(companyCode);
        const Items = await ItemModel.find();
        res.status(200).json({ Items });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const fetchOnlineItems = async (req, res) => {
    try {
        const allUsers = await Master.find({}, "companyCode");
        if (!allUsers.length) return res.status(404).json({ message: MESSAGES.ERROR.COMPANY_NOT_FOUND });

        const allItems = [];
        for (const user of allUsers) {
            try {
                const { ItemModel } = await getCompanyDB(user.companyCode);
                const items = await ItemModel.find();
                const mappedItems = items.map(item => ({
                    ...item.toObject(),
                    companyCode: user.companyCode
                }));
                allItems.push(...mappedItems);
            } catch (err) {
                console.error(`Error fetching from ${user.companyCode}:`, err.message);
            }
        }

        res.status(200).json({ items: allItems });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateItem = async (req, res) => {
    try {
        const { id } = req.params;
        const { formData, image } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: MESSAGES.ERROR.INVALID_ID });
        }

        const companyCode = req.user["companyCode"];
        const { ItemModel } = await getCompanyDB(companyCode);

        const existingItem = await ItemModel.findById(id);
        if (!existingItem) return res.status(404).json({ error: messages.ERROR.ITEM_NOT_FOUND });

        let base64Image = existingItem.Image;
        if (image && /^data:image\/[a-zA-Z]+;base64,/.test(image)) {
            base64Image = image;
        }

        const {
            itemName, category, itemCode, salePrice, discount,
            discountType, purchasePrice, taxName, taxRate,
            wholesalePrice, minWholesaleOrder, Stock
        } = formData;

        const updatedFields = {
            ItemName: itemName,
            ItemCategory: category,
            ItemCode: itemCode,
            SalePrice: salePrice,
            Discount: discount,
            DiscountType: discountType,
            PurchasePrice: purchasePrice,
            Tax: taxName,
            TaxRate: taxRate,
            WholesalePrice: wholesalePrice,
            MinWholesaleOrder: minWholesaleOrder,
            Image: base64Image,
            Stock: Array.isArray(Stock) ? Stock.map(stockItem => ({
                OpeningQuentity: stockItem.OpeningQuentity,
                AtPrice: stockItem.AtPrice,
                AsOfDate: stockItem.AsOfDate,
                MinStockMaintain: stockItem.MinStockMaintain,
                Location: stockItem.Location
            })) : existingItem.Stock
        };

        const updatedItem = await ItemModel.findByIdAndUpdate(id, { $set: updatedFields }, { new: true });
        res.status(200).json({ message: MESSAGES.SUCCESS.ITEM_UPDATED, updatedItem });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const deleteItem = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: MESSAGES.ERROR.INVALID_ID });
        }

        const companyCode = req.user["companyCode"];
        const { ItemModel } = await getCompanyDB(companyCode);

        const deletedItem = await ItemModel.findByIdAndDelete(id);
        if (!deletedItem) return res.status(404).json({ error: MESSAGES.ERROR.ITEM_NOT_FOUND });

        res.status(200).json({ message: MESSAGES.SUCCESS.ITEM_DELETED, deletedItem });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export { createItem, FetchItem, fetchOnlineItems, deleteItem, updateItem };
