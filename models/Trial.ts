import mongoose, { Schema, model, models } from "mongoose";

const TrialSessionSchema = new Schema({
  name: { type: String, required: true },
  date: { type: String, required: true },
  time: String,
  venue: String,
  isSpecial: { type: Boolean, default: false },
});

const TrialSchema = new Schema(
  {
    ageGroup: { type: String, required: true },
    season: { type: String, required: true },
    schedule: [TrialSessionSchema],
    details: String,
    requirements: [String],
  },
  { timestamps: true }
);

TrialSchema.index({ ageGroup: 1, season: 1 }, { unique: true });

const Trial = models.Trial || model("Trial", TrialSchema);
export default Trial;
