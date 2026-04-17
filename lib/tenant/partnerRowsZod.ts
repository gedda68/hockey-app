import { z } from "zod";

/** One row in `branding.partners` (association) or `publicPartners` (club). */
export const PublicPartnerRowSchema = z.object({
  name: z.string().min(1).max(120),
  url: z.string().max(2048).optional(),
  logoUrl: z.string().max(2048).optional(),
});

export const PublicPartnerRowsSchema = z.array(PublicPartnerRowSchema).max(24);
