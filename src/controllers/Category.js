import mongoose from "mongoose";
import Master from "../models/MasterDB.js";
import CategoriesSchema from "../models/Category.js";
import MESSAGES from "../config/messages.js";


const getCompanyDbAndModel = async (companyCode, schema, modelName) => {
    const user = await Master.findOne({ companyCode });
    if (!user) throw new Error(MESSAGES.USER_NOT_FOUND);

    const dbName = user.companyCode;
    if (!dbName) throw new Error(MESSAGES.COMPANY_CODE_REQUIRED);

    const companyDB = mongoose.connection.useDb(dbName);
    const Model = companyDB.models[modelName] || companyDB.model(modelName, schema);

    return { companyDB, Model };
};



const createCategory = async (req, res) => {
    try {
        const { CategoryName } = req.body;
        const companyCode = req.user["companyCode"];

        if (!CategoryName) {
            return res.status(400).json({ message: MESSAGES.ERROR.CATEGORY_NAME_REQUIRED });
        }

        const { Model: CategoryModel } = await getCompanyDbAndModel(companyCode, CategoriesSchema, "Categories");

        const newCategory = new CategoryModel({ CategoryName });
        await newCategory.save();

        res.status(201).json({ message:MESSAGES.SUCCESS.CATEGORY_CREATED, newCategory });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const fetchCategory = async (req, res) => {
    try {
        const companyCode = req.user["companyCode"];
        const { Model: CategoryModel } = await getCompanyDbAndModel(companyCode, CategoriesSchema, "Categories");

        const categories = await CategoryModel.find();
        res.status(200).json({ categories });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const fetchOnlineCategory = async (req, res) => {
    try {
        const allUsers = await Master.find({}, "companyCode");

        if (!allUsers.length) {
            return res.status(404).json({ message: MESSAGES.ERROR.COMPANY_NOT_FOUND });
        }

        let allCategories = [];

        for (const { companyCode } of allUsers) {
            try {
                const { Model: CategoryModel } = await getCompanyDbAndModel(companyCode, CategoriesSchema, "Categories");
                const categories = await CategoryModel.find();

                const categoriesWithCompany = categories.map(cat => ({
                    ...cat.toObject(),
                    companyCode,
                }));

                allCategories.push(...categoriesWithCompany);
            } catch (err) {
                console.warn(`Error fetching for ${companyCode}: ${err.message}`);
                continue; // Proceed even if one company fails
            }
        }

        res.status(200).json({ categories: allCategories });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { CategoryName } = req.body;
        const companyCode = req.user["companyCode"];

        if (!CategoryName) {
            return res.status(400).json({message: MESSAGES.ERROR.CATEGORY_NAME_REQUIRED });
        }

        const { Model: CategoryModel } = await getCompanyDbAndModel(companyCode, CategoriesSchema, "Categories");

        const category = await CategoryModel.findById(id);
        if (!category) {
            return res.status(404).json({ message: MESSAGES.ERROR.CATEGORY_NOT_FOUND });
        }

        category.CategoryName = CategoryName;
        await category.save();

        res.status(200).json({ message: MESSAGES.SUCCESS.CATEGORY_UPDATED , category });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const companyCode = req.user["companyCode"];

        const { Model: CategoryModel } = await getCompanyDbAndModel(companyCode, CategoriesSchema, "Categories");

        const category = await CategoryModel.findById(id);
        if (!category) {
            return res.status(404).json({ message: MESSAGES.ERROR.CATEGORY_NOT_FOUND });
        }

        await CategoryModel.findByIdAndDelete(id);
        res.status(200).json({ message: MESSAGES.SUCCESS.CATEGORY_DELETED });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export {
    createCategory,
    fetchCategory,
    fetchOnlineCategory,
    updateCategory,
    deleteCategory,
};
