import mongoose from "mongoose";

export async function connectDB(mongoUri) {
  if (!mongoUri) {
    throw new Error("MONGODB_URI is missing. Add it in your .env file.");
  }

  mongoose.set("strictQuery", true);

  await mongoose.connect(mongoUri, {
    autoIndex: true,
  });

  console.log("MongoDB connected successfully");
}
