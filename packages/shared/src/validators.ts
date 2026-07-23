import { z } from "zod";

export const registerCompanySchema = z.object({
  companyName: z.string().min(2).max(120),
  fullName: z.string().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(8).max(72),
  phone: z.string().max(40).optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const employeeFormSchema = z.object({
  fullName: z.string().min(2).max(120),
  employeeCode: z.string().min(1).max(40),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(40).optional().or(z.literal("")),
  departmentId: z.string().uuid().optional().nullable(),
  positionId: z.string().uuid().optional().nullable(),
  hireDate: z.string().optional().nullable(),
  notes: z.string().max(2000).optional().or(z.literal("")),
});

export const leaveRequestSchema = z.object({
  leaveTypeId: z.string().uuid(),
  startDate: z.string(),
  endDate: z.string(),
  reason: z.string().max(1000).optional().or(z.literal("")),
});

export type RegisterCompanyInput = z.infer<typeof registerCompanySchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type EmployeeFormInput = z.infer<typeof employeeFormSchema>;
export type LeaveRequestInput = z.infer<typeof leaveRequestSchema>;
