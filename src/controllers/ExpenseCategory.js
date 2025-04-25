import mongoose from "mongoose";
import ExpenseCategoriesSchema from "../models/ExpenseCategory.js";
import Master from "../models/MasterDB.js"; // Ensure you import the Master model

const createExpenseCategory = async (req, res) => {
    try {
        const { CategoryName } = req.body;
        const CompanyCode = req.user["companyCode"];

        // Step 1: Find the user in the Master Database
        const user = await Master.findOne({ companyCode: CompanyCode });
        if (!user) return res.status(404).json({ error: "User not found" });

        // Step 2: Get the user's Company Code
        const companyCode = user.companyCode;
        if (!companyCode) return res.status(400).json({ error: "Company code not found" });

        // Step 3: Connect to the specific CompanyCode Database
        const companyDB = mongoose.connection.useDb(companyCode);

        // Step 4: Define the Category model in the specific database
        const ExpenseCategoryModel = companyDB.models.ExpenseCategory || companyDB.model("ExpenseCategory", ExpenseCategoriesSchema);

        // Step 5: Validate input data
        if (!CategoryName) {
            return res.status(400).json({ error: "Category Name is required" });
        }

        // Step 6: Save the category record
        const newCategory = new ExpenseCategoryModel({
            CategoryName,
        });

        await newCategory.save();

        res.status(201).json({ message: "Expense Category created successfully", companyCode });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


const FetchExpenseCategory = async (req, res) => {
    try {
        const CompanyCode = req.user["companyCode"];

        // Step 1: Find the user in the Master Database
        const user = await Master.findOne({ companyCode: CompanyCode });
        if (!user) return res.status(404).json({ error: "User not found" });

        // Step 2: Get the user's Company Code
        const companyCode = user.companyCode;
        if (!companyCode) return res.status(400).json({ error: "Company code not found" });

        // Step 3: Connect to the specific CompanyCode Database
        const companyDB = mongoose.connection.useDb(companyCode);

        // Step 4: Use or define the Category model in the specific database
        const ExpenseCategoryModel = companyDB.models.ExpenseCategory || companyDB.model("ExpenseCategory", ExpenseCategoriesSchema);

        // Step 5: Fetch all categories
        const categories = await ExpenseCategoryModel.find();

        res.status(200).json({ categories });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const deleteExpenseCategory = async (req, res) => {
    try {
        const { id } = req.params; // Get category ID from request params
        const CompanyCode = req.user["companyCode"];

        // Step 1: Find the user in the Master Database
        const user = await Master.findOne({ companyCode: CompanyCode });
        if (!user) return res.status(404).json({ error: "User not found" });

        // Step 2: Connect to the specific CompanyCode Database
        const companyDB = mongoose.connection.useDb(user.companyCode);

        // Step 3: Define the Category model in the specific database
        const ExpenseCategoryModel = companyDB.models.ExpenseCategory || companyDB.model("ExpenseCategory", ExpenseCategoriesSchema);

        // Step 4: Find and delete the category
        const deletedCategory = await ExpenseCategoryModel.findByIdAndDelete(id);

        if (!deletedCategory) {
            return res.status(404).json({ error: "Expense Category not found" });
        }

        res.status(200).json({ message: "Expense Category deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export { FetchExpenseCategory, createExpenseCategory, deleteExpenseCategory };
