import mongoose, { Schema, model, models } from "mongoose";

const RegistrationSchema = new Schema(
  {
    ageGroup: { type: String, required: true }, // e.g., "Under 14"
    season: { type: String, required: true }, // e.g., "2026"

    // Configuration for age limits
    minAge: { type: Number, required: true }, // e.g., 12
    maxAge: { type: Number, required: true }, // e.g., 14

    status: {
      type: String,
      enum: ["Open", "Closed", "Waitlist"],
      default: "Closed",
    },

    fees: {
      standard: { type: Number, default: 0 },
      earlyBird: { type: Number, default: 0 },
    },

    openingDate: Date,
    closingDate: Date,
  },
  {
    timestamps: true,
  }
);

/**
 * Validation Method: checks if a player's DOB is eligible for this registration
 * Logic: Age as of Jan 1st of the season year
 */
RegistrationSchema.methods.checkEligibility = function (userDob: Date) {
  const birthYear = new Date(userDob).getFullYear();
  const seasonYear = parseInt(this.season);
  const ageOnJan1 = seasonYear - birthYear;

  return {
    isEligible: ageOnJan1 >= this.minAge && ageOnJan1 <= this.maxAge,
    currentAge: ageOnJan1,
    requiredRange: `${this.minAge} - ${this.maxAge}`,
  };
};

const Registration =
  models.Registration || model("Registration", RegistrationSchema);
export default Registration;
