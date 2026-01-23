import mongoose, { Schema, model, models } from "mongoose";

const TournamentSchema = new Schema(
  {
    ageGroup: { type: String, required: true },
    season: { type: String, required: true },
    eventName: { type: String, required: true },
    location: String,
    startDate: Date,
    endDate: Date,
    venue: String,
    accommodation: {
      name: String,
      address: String,
      notes: String,
    },
    travelDetails: String,
  },
  { timestamps: true }
);

// Ensure one tournament entry per ageGroup/season
TournamentSchema.index({ ageGroup: 1, season: 1 }, { unique: true });

const Tournament = models.Tournament || model("Tournament", TournamentSchema);
export default Tournament;
