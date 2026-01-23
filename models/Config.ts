import mongoose, { Schema, model, models } from "mongoose";

const ConfigSchema = new Schema({
  id: { type: String, required: true, unique: true },
  label: { type: String, required: true },
  description: { type: String },
  isActive: { type: Boolean, default: true },
});

// We export three separate models pointing to three different collections
export const Role = models.Role || model("Role", ConfigSchema, "config_roles");
export const Gender =
  models.Gender || model("Gender", ConfigSchema, "config_genders");
export const RelationshipType =
  models.RelationshipType ||
  model("RelationshipType", ConfigSchema, "config_relationships");
