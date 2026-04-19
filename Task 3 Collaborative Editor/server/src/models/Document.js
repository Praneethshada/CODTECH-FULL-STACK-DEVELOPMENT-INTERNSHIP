import mongoose from "mongoose";

const documentSchema = new mongoose.Schema(
  {
    docId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    content: {
      type: String,
      default: "Start typing here...",
    },
  },
  {
    timestamps: true,
  },
);

export const Document = mongoose.model("Document", documentSchema);
