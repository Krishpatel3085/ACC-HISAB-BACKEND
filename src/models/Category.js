import mongoose from "mongoose";

const CategoriesSchema = new mongoose.Schema(
    {
        CategoryName: String,
    },
    { timestamps: true } // Corrected the typo
);

export default CategoriesSchema;
