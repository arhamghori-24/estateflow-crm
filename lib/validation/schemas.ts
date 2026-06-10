import { z } from "zod";

export const leadSourceEnum = z.enum([
  "36_acre","magicbricks","housing","facebook","instagram","website","referral","manual","whatsapp","other",
]);
export const leadStatusEnum = z.enum([
  "new","contacted","interested","site_visit_scheduled","negotiation","won","lost","not_responding","call_pending",
]);
export const leadTempEnum = z.enum(["cold","warm","hot"]);
export const propertyTypeEnum = z.enum(["apartment","villa","plot","commercial","rental"]);
export const propertyStatusEnum = z.enum(["available","hold","sold","rented"]);
export const followupTypeEnum = z.enum(["call","whatsapp","sms","email","meeting"]);
export const messageChannelEnum = z.enum(["whatsapp","sms","email"]);
export const userRoleEnum = z.enum(["admin","sales_manager","sales_agent","field_executive","social_media_manager"]);

export const phoneSchema = z
  .string()
  .trim()
  .min(8, "Phone number too short")
  .regex(/^\+?[0-9\s\-]+$/, "Invalid phone number")
  .transform((v) => v.replace(/[\s\-]/g, ""));

export const leadCreateSchema = z.object({
  full_name: z.string().min(2),
  phone: phoneSchema,
  email: z.string().email().optional().nullable(),
  source: leadSourceEnum.default("manual"),
  property_type: propertyTypeEnum.optional().nullable(),
  budget_min: z.coerce.number().nonnegative().optional().nullable(),
  budget_max: z.coerce.number().nonnegative().optional().nullable(),
  preferred_location: z.string().optional().nullable(),
  temperature: leadTempEnum.default("warm"),
  notes: z.string().optional().nullable(),
  next_followup_at: z.string().optional().nullable(),
  assigned_agent_id: z.string().uuid().optional().nullable(),
});

export const leadWebhookSchema = z.object({
  fullName: z.string().min(2),
  phone: phoneSchema,
  email: z.string().email().optional().nullable(),
  source: z.string().optional().default("other"),
  propertyType: z.string().optional().nullable(),
  budgetMin: z.coerce.number().nonnegative().optional().nullable(),
  budgetMax: z.coerce.number().nonnegative().optional().nullable(),
  preferredLocation: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const propertyCreateSchema = z.object({
  title: z.string().min(2),
  location: z.string().min(2),
  address: z.string().optional().nullable(),
  property_type: propertyTypeEnum,
  price: z.coerce.number().nonnegative(),
  size_sqft: z.coerce.number().nonnegative().optional().nullable(),
  bedrooms: z.coerce.number().int().nonnegative().optional().nullable(),
  bathrooms: z.coerce.number().int().nonnegative().optional().nullable(),
  floor: z.coerce.number().int().optional().nullable(),
  furnishing: z.string().optional().nullable(),
  status: propertyStatusEnum.default("available"),
  description: z.string().optional().nullable(),
  amenities: z.array(z.string()).default([]),
  developer_name: z.string().optional().nullable(),
});

export const followupCreateSchema = z.object({
  lead_id: z.string().uuid(),
  type: followupTypeEnum,
  title: z.string().min(2),
  notes: z.string().optional().nullable(),
  due_at: z.string(), // ISO datetime
  assigned_to: z.string().uuid().optional().nullable(),
});

export const messageSendSchema = z.object({
  lead_id: z.string().uuid(),
  channel: messageChannelEnum,
  body: z.string().min(1),
  subject: z.string().optional(),
});

export const attendanceCheckInSchema = z.object({
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
  selfieUrl: z.string().url().optional(),
  notes: z.string().optional(),
});

export const socialPostSchema = z.object({
  title: z.string().min(2),
  post_type: z.enum(["instagram_reel","instagram_post","facebook_post","linkedin_post","story","twitter_post"]),
  caption: z.string().optional().nullable(),
  media_urls: z.array(z.string().url()).default([]),
  status: z.enum(["idea","draft","scheduled","published","failed"]).default("draft"),
  scheduled_at: z.string().optional().nullable(),
  assigned_to: z.string().uuid().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const inviteCreateSchema = z.object({
  email: z.string().email(),
  role: userRoleEnum.default("sales_agent"),
});

export const integrationSettingsSchema = z.object({
  lead_webhook_secret: z.string().optional().nullable(),
  default_assignment_mode: z.enum(["round_robin","manual","least_busy"]).default("round_robin"),
  social_publish_webhook_url: z.string().url().optional().nullable().or(z.literal("")),
});

export const sourceMapping: Record<string, string> = {
  "36 acre": "36_acre",
  "36acre": "36_acre",
  "magicbricks": "magicbricks",
  "magic bricks": "magicbricks",
  "housing": "housing",
  "housing.com": "housing",
  "facebook": "facebook",
  "fb": "facebook",
  "instagram": "instagram",
  "ig": "instagram",
  "website": "website",
  "referral": "referral",
  "manual": "manual",
  "whatsapp": "whatsapp",
};

export function normalizeSource(input?: string | null): string {
  if (!input) return "other";
  return sourceMapping[input.toLowerCase().trim()] ?? "other";
}
