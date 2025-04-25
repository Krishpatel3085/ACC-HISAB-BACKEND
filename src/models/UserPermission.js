import mongoose from "mongoose";

const permissionSchema = new mongoose.Schema({
    userGroup: { type: String, required: true },
    permissions: [
        {
            formName: String,
            view: { type: Boolean, default: false },
            insert: { type: Boolean, default: false },
            update: { type: Boolean, default: false },
            delete: { type: Boolean, default: false }
        }
    ]
});

export default permissionSchema;
