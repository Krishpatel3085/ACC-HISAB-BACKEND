import mongoose from "mongoose";

const ExpenseCategoriesSchema = new mongoose.Schema(
    {
        CategoryName: String,
    },
    { timestamps: true } // Corrected the typo
);

export default ExpenseCategoriesSchema;
