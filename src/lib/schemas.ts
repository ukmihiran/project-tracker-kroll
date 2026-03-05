import { z } from "zod";

export const ProjectSchema = z.object({
  id: z.string().optional(),
  projectID: z.string().optional(),
  engagementName: z.string().min(1, "Engagement name is required"),
  clientName: z.string().min(1, "Client name is required"),
  assessmentType: z.string().min(1, "Assessment type is required"),
  status: z.enum(["Active", "Placeholder", "Delivered", "Cancelled"]).default("Active"),
  billable: z.boolean().default(true),
  shadowing: z.boolean().default(false),
  effortTimeHours: z.coerce.number().min(0).default(0),
  timelineStart: z.coerce.date().optional(),
  timelineEnd: z.coerce.date().optional(),
  EM: z.string().optional(),
  PM: z.string().optional(),
  consultants: z.string().optional(),
  projectReportLink: z.string().url("Must be a valid URL").optional().or(z.literal('')),
  isMultiPerson: z.boolean().default(false),
  isLeadConsultant: z.boolean().default(false),
});

export const EfrSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, "EFR title is required"),
  description: z.string().optional(),
  quarter: z.string().min(1, "Quarter is required"),
  evaluator: z.string().min(1, "Evaluator name is required"),
  engagement: z.string().min(1, "Engagement is required"),
  engagementStart: z.coerce.date({ error: "Engagement start date is required" }),
  role: z.string().min(1, "Role is required"),
  duration: z.enum(["Less than a week", "1 week", "2 weeks", "3 weeks or more"], {
    error: "Duration is required",
  }),
  contextComment: z.string().optional(),
});

export const RegisterSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
  email: z.string().email("Invalid email address").max(255, "Email is too long"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password is too long")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
});

export const LoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const UpdateProfileSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
  email: z.string().email("Invalid email address").max(255, "Email is too long"),
});

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password is too long")
    .regex(/[A-Z]/, "Must contain at least one uppercase letter")
    .regex(/[a-z]/, "Must contain at least one lowercase letter")
    .regex(/[0-9]/, "Must contain at least one number"),
  confirmPassword: z.string().min(1, "Please confirm your new password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export type ProjectInput = z.infer<typeof ProjectSchema>;
export type EfrInput = z.infer<typeof EfrSchema>;
export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;
