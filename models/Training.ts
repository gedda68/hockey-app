import mongoose, { Schema, model, models } from "mongoose";

const TrainingSessionSchema = new Schema({
  name: { type: String, required: true },
  day: { type: String, required: true }, // e.g., "Tuesday"
  time: String,
  venue: String,
  frequency: { type: String, default: "Weekly" },
});

const TrainingSchema = new Schema(
  {
    ageGroup: { type: String, required: true },
    season: { type: String, required: true },
    schedule: [TrainingSessionSchema],
    coachingStaff: [
      {
        userId: { type: Schema.Types.ObjectId, ref: "User" },
        role: String, // e.g., "Head Coach"
      },
    ],
  },
  { timestamps: true }
);

TrainingSchema.index({ ageGroup: 1, season: 1 }, { unique: true });

const Training = models.Training || model("Training", TrainingSchema);
export default Training;
