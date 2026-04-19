// Epic V1 — Association-owned venue directory + pitch inventory (master data).

import { z } from "zod";

export const VenueStatusSchema = z.enum(["active", "inactive"]);

export const PitchSurfaceSchema = z.enum([
  "grass",
  "turf",
  "water",
  "sand",
  "indoor",
  "hybrid",
  "other",
]);

export const VenuePitchSchema = z
  .object({
    pitchId: z.string().min(1),
    label: z.string().min(1).max(160),
    surface: PitchSurfaceSchema.default("turf"),
  })
  .strict();

export const VenueAddressSchema = z
  .object({
    street: z.string().min(1).max(300),
    suburb: z.string().min(1).max(120),
    city: z.string().min(1).max(120),
    state: z.string().min(1).max(80),
    postcode: z.string().min(1).max(20),
    country: z.string().min(1).max(80).default("Australia"),
  })
  .strict();

export const VenueGeoSchema = z
  .object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  })
  .strict();

export const AssociationVenueSchema = z
  .object({
    venueId: z.string().min(1),
    associationId: z.string().min(1),
    name: z.string().min(1).max(200),
    shortCode: z.string().max(24).optional(),
    status: VenueStatusSchema.default("active"),
    address: VenueAddressSchema,
    geo: VenueGeoSchema.nullable().optional(),
    pitches: z.array(VenuePitchSchema).max(80).default([]),
    notes: z.string().max(2000).optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
    createdBy: z.string().optional(),
    updatedBy: z.string().optional(),
  })
  .strict();

export const CreateAssociationVenueBodySchema = z
  .object({
    name: z.string().min(1).max(200),
    shortCode: z.string().max(24).optional(),
    address: VenueAddressSchema,
    geo: VenueGeoSchema.nullable().optional(),
    pitches: z
      .array(
        z
          .object({
            pitchId: z.string().min(1).optional(),
            label: z.string().min(1).max(160),
            surface: PitchSurfaceSchema.optional(),
          })
          .strict(),
      )
      .max(80)
      .optional(),
    notes: z.string().max(2000).optional(),
  })
  .strict();

export const PatchAssociationVenueBodySchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    shortCode: z.union([z.string().max(24), z.null()]).optional(),
    status: VenueStatusSchema.optional(),
    address: VenueAddressSchema.optional(),
    geo: z.union([VenueGeoSchema, z.null()]).optional(),
    pitches: z.array(VenuePitchSchema).max(80).optional(),
    notes: z.union([z.string().max(2000), z.null()]).optional(),
  })
  .strict()
  .refine((d) => Object.keys(d).length > 0, { message: "At least one field is required" });

export type AssociationVenue = z.infer<typeof AssociationVenueSchema>;
export type VenuePitch = z.infer<typeof VenuePitchSchema>;
