import mongoose from "mongoose";

const TrafficSchema = new mongoose.Schema(
  {
    ip: String,
    userAgent: String,
    date: { type: String }, // YYYY-MM-DD
  },
  { timestamps: true }
);

export default mongoose.models.Traffic || mongoose.model("Traffic", TrafficSchema);
