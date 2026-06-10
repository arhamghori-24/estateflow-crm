import type { UserRole } from "@/lib/types/database";

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Admin",
  sales_manager: "Sales Manager",
  sales_agent: "Sales Agent",
  field_executive: "Field Executive",
  social_media_manager: "Social Media Manager",
};
