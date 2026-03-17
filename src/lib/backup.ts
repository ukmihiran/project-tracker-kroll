import { z } from "zod";

import {
  EfrDurationSchema,
  ProjectStatusSchema,
  TaskPrioritySchema,
  TaskStatusSchema,
  WorkCycleStatusSchema,
} from "./schemas";

const backupDateSchema = z.union([z.string(), z.date()]).pipe(z.coerce.date());
const optionalTextSchema = z.string().optional().nullable();
const optionalUrlSchema = z.string().url().optional().nullable().or(z.literal(""));

export const MAX_BACKUP_SIZE_BYTES = 5 * 1024 * 1024;

export const BackupProjectItemSchema = z.object({
  workCycleYear: z.number().int().min(2000).max(2100).optional(),
  projectID: optionalTextSchema,
  engagementName: z.string().min(1),
  clientName: z.string().min(1),
  assessmentType: z.string().min(1),
  status: ProjectStatusSchema.default("Active"),
  billable: z.boolean().default(true),
  shadowing: z.boolean().default(false),
  effortTimeHours: z.coerce.number().min(0).default(0),
  timelineStart: backupDateSchema.optional().nullable(),
  timelineEnd: backupDateSchema.optional().nullable(),
  EM: optionalTextSchema,
  PM: optionalTextSchema,
  consultants: optionalTextSchema,
  projectReportLink: optionalUrlSchema,
  isMultiPerson: z.boolean().default(false),
  isLeadConsultant: z.boolean().default(false),
  archivedAt: backupDateSchema.optional().nullable(),
  archivedReason: optionalTextSchema,
});

export const BackupEfrItemSchema = z.object({
  workCycleYear: z.number().int().min(2000).max(2100).optional(),
  projectFingerprint: z.string().optional().nullable(),
  title: z.string().min(1),
  description: optionalTextSchema,
  quarter: z.string().min(1),
  evaluator: z.string().min(1),
  engagement: z.string().min(1),
  engagementStart: backupDateSchema,
  role: z.string().min(1),
  duration: EfrDurationSchema,
  contextComment: optionalTextSchema,
  submittedAt: backupDateSchema.optional().nullable(),
  archivedAt: backupDateSchema.optional().nullable(),
  archivedReason: optionalTextSchema,
});

export const BackupWorkCycleItemSchema = z.object({
  name: z.string().min(1),
  year: z.number().int().min(2000).max(2100),
  startDate: backupDateSchema,
  endDate: backupDateSchema,
  status: WorkCycleStatusSchema.default("ACTIVE"),
  focusText: optionalTextSchema,
  billableTarget: z.coerce.number().int().min(0).default(1500),
  efrTarget: z.coerce.number().int().min(0).default(3),
  multiPersonTarget: z.coerce.number().int().min(0).default(1),
});

export const BackupTaskItemSchema = z.object({
  workCycleYear: z.number().int().min(2000).max(2100).optional(),
  projectFingerprint: z.string().optional().nullable(),
  title: z.string().min(1),
  description: optionalTextSchema,
  status: TaskStatusSchema.default("TODO"),
  priority: TaskPrioritySchema.default("MEDIUM"),
  dueDate: backupDateSchema.optional().nullable(),
  reminderAt: backupDateSchema.optional().nullable(),
  completedAt: backupDateSchema.optional().nullable(),
  estimateHours: z.coerce.number().int().min(0).default(0),
  archivedAt: backupDateSchema.optional().nullable(),
  archivedReason: optionalTextSchema,
});

export const BackupPayloadSchema = z.object({
  version: z.string().min(1),
  exportedAt: backupDateSchema.optional(),
  user: z
    .object({
      name: optionalTextSchema,
      email: z.string().email().optional().nullable(),
      role: optionalTextSchema,
      createdAt: backupDateSchema.optional().nullable(),
    })
    .optional(),
  workCycles: z.array(BackupWorkCycleItemSchema).default([]),
  projects: z.array(BackupProjectItemSchema),
  efrs: z.array(BackupEfrItemSchema),
  tasks: z.array(BackupTaskItemSchema).default([]),
});

export type BackupProjectItem = z.infer<typeof BackupProjectItemSchema>;
export type BackupEfrItem = z.infer<typeof BackupEfrItemSchema>;
export type BackupWorkCycleItem = z.infer<typeof BackupWorkCycleItemSchema>;
export type BackupTaskItem = z.infer<typeof BackupTaskItemSchema>;
export type BackupPayload = z.infer<typeof BackupPayloadSchema>;

type ProjectFingerprintSource = {
  workCycleYear?: number | null;
  projectID?: string | null;
  engagementName: string;
  clientName: string;
  assessmentType: string;
  status: string;
  billable: boolean;
  shadowing: boolean;
  effortTimeHours: number;
  timelineStart?: Date | string | null;
  timelineEnd?: Date | string | null;
  EM?: string | null;
  PM?: string | null;
  consultants?: string | null;
  projectReportLink?: string | null;
  isMultiPerson: boolean;
  isLeadConsultant: boolean;
};

type EfrFingerprintSource = {
  workCycleYear?: number | null;
  projectFingerprint?: string | null;
  title: string;
  description?: string | null;
  quarter: string;
  evaluator: string;
  engagement: string;
  engagementStart: Date | string;
  role: string;
  duration: string;
  contextComment?: string | null;
};

type TaskFingerprintSource = {
  workCycleYear?: number | null;
  projectFingerprint?: string | null;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  dueDate?: Date | string | null;
  reminderAt?: Date | string | null;
  estimateHours: number;
};

function normalizeText(value?: string | null) {
  return value?.trim().toLowerCase() ?? "";
}

function normalizeOptionalDate(value?: Date | string | null) {
  return value ? new Date(value).toISOString() : "";
}

export function createProjectFingerprint(project: ProjectFingerprintSource) {
  return [
    String(project.workCycleYear ?? ""),
    normalizeText(project.projectID),
    normalizeText(project.engagementName),
    normalizeText(project.clientName),
    normalizeText(project.assessmentType),
    normalizeText(project.status),
    String(project.billable),
    String(project.shadowing),
    String(project.effortTimeHours),
    normalizeOptionalDate(project.timelineStart ?? null),
    normalizeOptionalDate(project.timelineEnd ?? null),
    normalizeText(project.EM),
    normalizeText(project.PM),
    normalizeText(project.consultants),
    normalizeText(project.projectReportLink),
    String(project.isMultiPerson),
    String(project.isLeadConsultant),
  ].join("|");
}

export function createEfrFingerprint(efr: EfrFingerprintSource) {
  return [
    String(efr.workCycleYear ?? ""),
    normalizeText(efr.projectFingerprint),
    normalizeText(efr.title),
    normalizeText(efr.description),
    normalizeText(efr.quarter),
    normalizeText(efr.evaluator),
    normalizeText(efr.engagement),
    normalizeOptionalDate(efr.engagementStart),
    normalizeText(efr.role),
    normalizeText(efr.duration),
    normalizeText(efr.contextComment),
  ].join("|");
}

export function createTaskFingerprint(task: TaskFingerprintSource) {
  return [
    String(task.workCycleYear ?? ""),
    normalizeText(task.projectFingerprint),
    normalizeText(task.title),
    normalizeText(task.description),
    normalizeText(task.status),
    normalizeText(task.priority),
    normalizeOptionalDate(task.dueDate ?? null),
    normalizeOptionalDate(task.reminderAt ?? null),
    String(task.estimateHours),
  ].join("|");
}

export function parseBackupPayload(jsonData: string) {
  if (Buffer.byteLength(jsonData, "utf8") > MAX_BACKUP_SIZE_BYTES) {
    return {
      success: false as const,
      error: "Backup file is too large. Maximum supported size is 5 MB.",
    };
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(jsonData);
  } catch {
    return { success: false as const, error: "Invalid JSON file" };
  }

  const parsedBackup = BackupPayloadSchema.safeParse(parsedJson);
  if (!parsedBackup.success) {
    return { success: false as const, error: "Invalid backup file format" };
  }

  return { success: true as const, data: parsedBackup.data };
}
