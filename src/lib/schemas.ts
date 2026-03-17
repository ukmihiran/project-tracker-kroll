import { z } from "zod";

const optionalDateField = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) {
    return undefined;
  }

  return value;
}, z.coerce.date().optional());

const optionalUrlField = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) {
    return undefined;
  }

  return value;
}, z.string().url("Must be a valid URL").optional());

export const WorkCycleStatusSchema = z.enum(["ACTIVE", "PLANNED", "CLOSED"]);
export const ProjectStatusSchema = z.enum(["Active", "Placeholder", "Delivered", "Cancelled"]);
export const TaskStatusSchema = z.enum(["TODO", "IN_PROGRESS", "BLOCKED", "DONE"]);
export const TaskPrioritySchema = z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]);

export const WorkCycleSchema = z.object({
  name: z.string().min(1, "Cycle name is required"),
  year: z.coerce.number().int().min(2000).max(2100),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  status: WorkCycleStatusSchema.default("ACTIVE"),
  focusText: z.string().max(200, "Focus text is too long").optional(),
  billableTarget: z.coerce.number().int().min(0).default(1500),
  efrTarget: z.coerce.number().int().min(0).default(3),
  multiPersonTarget: z.coerce.number().int().min(0).default(1),
}).superRefine((data, ctx) => {
  if (data.endDate < data.startDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Cycle end date must be on or after the start date",
      path: ["endDate"],
    });
  }
});

export const ProjectSchema = z.object({
  workCycleId: z.string().optional(),
  projectID: z.string().optional(),
  engagementName: z.string().min(1, "Engagement name is required"),
  clientName: z.string().min(1, "Client name is required"),
  assessmentType: z.string().min(1, "Assessment type is required"),
  status: ProjectStatusSchema.default("Active"),
  billable: z.boolean().default(true),
  shadowing: z.boolean().default(false),
  effortTimeHours: z.coerce.number().min(0).default(0),
  timelineStart: optionalDateField,
  timelineEnd: optionalDateField,
  EM: z.string().optional(),
  PM: z.string().optional(),
  consultants: z.string().optional(),
  projectReportLink: optionalUrlField,
  isMultiPerson: z.boolean().default(false),
  isLeadConsultant: z.boolean().default(false),
}).superRefine((data, ctx) => {
  if (data.timelineStart && data.timelineEnd && data.timelineEnd < data.timelineStart) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Timeline end date must be on or after the start date",
      path: ["timelineEnd"],
    });
  }
});

export const EfrDurationSchema = z.enum([
  "Less than a week",
  "1 week",
  "2 weeks",
  "3 weeks or more",
]);

export const EfrSchema = z.object({
  workCycleId: z.string().optional(),
  projectId: z.string().optional(),
  title: z.string().min(1, "EFR title is required"),
  description: z.string().optional(),
  quarter: z.string().min(1, "Quarter is required"),
  evaluator: z.string().min(1, "Evaluator name is required"),
  engagement: z.string().min(1, "Engagement is required"),
  engagementStart: z.coerce.date({ error: "Engagement start date is required" }),
  role: z.string().min(1, "Role is required"),
  duration: EfrDurationSchema,
  contextComment: z.string().optional(),
});

export const TaskSchema = z.object({
  workCycleId: z.string().optional(),
  projectId: z.string().optional(),
  title: z.string().min(1, "Task title is required").max(120, "Task title is too long"),
  description: z.string().max(1000, "Description is too long").optional(),
  status: TaskStatusSchema.default("TODO"),
  priority: TaskPrioritySchema.default("MEDIUM"),
  dueDate: optionalDateField,
  reminderAt: optionalDateField,
  estimateHours: z.coerce.number().min(0).max(1000).default(0),
}).superRefine((data, ctx) => {
  if (data.reminderAt && data.dueDate && data.reminderAt > data.dueDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Reminder date should be on or before the due date",
      path: ["reminderAt"],
    });
  }
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

export type WorkCycleInput = z.infer<typeof WorkCycleSchema>;
export type ProjectInput = z.infer<typeof ProjectSchema>;
export type EfrInput = z.infer<typeof EfrSchema>;
export type TaskInput = z.infer<typeof TaskSchema>;
export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;
