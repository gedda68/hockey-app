import mongoose, { Schema, model, models } from "mongoose";

// Schema for Phone numbers (allows multiple)
const PhoneSchema = new Schema({
  number: { type: String, required: true },
  type: { type: String, enum: ["Mobile", "Home", "Work"], default: "Mobile" },
  primary: { type: Boolean, default: false },
});

// Schema for Emails (allows multiple)
const EmailSchema = new Schema({
  address: { type: String, required: true },
  type: {
    type: String,
    enum: ["Personal", "Work", "Other"],
    default: "Personal",
  },
  primary: { type: Boolean, default: false },
});

// Schema for Addresses
const AddressSchema = new Schema({
  street: String,
  suburb: String,
  state: String,
  postcode: String,
  country: { type: String, default: "Australia" },
});

const UserSchema = new Schema(
  {
    userId: { type: String, required: true, unique: true }, // Custom ID: USR-XXXX
    roles: [{ type: String }], // Array of IDs from config_roles (Player, Coach, etc.)

    personal: {
      firstName: { type: String, required: true },
      lastName: { type: String, required: true },
      dob: { type: Date, required: true },
      genderId: { type: String, required: true }, // ID from config_genders
    },

    contact: {
      emails: [EmailSchema],
      phones: [PhoneSchema],
      socialMedia: {
        facebook: String,
        instagram: String,
        twitter: String,
      },
    },

    homeAddress: AddressSchema,
    billingAddress: AddressSchema,

    relationships: [
      {
        relatedUserId: { type: Schema.Types.ObjectId, ref: "User" },
        relationTypeId: { type: String }, // ID from config_relationships
        isEmergencyContact: { type: Boolean, default: false },
      },
    ],

    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true, // Automatically creates createdAt and updatedAt
  }
);

// Prevent Next.js from initializing the model multiple times during hot reloads
const User = models.User || model("User", UserSchema);
export default User;
