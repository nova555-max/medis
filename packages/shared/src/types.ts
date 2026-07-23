export type UserRole = "admin" | "employee";

export type EmployeeStatus = "active" | "archived";

export type AttendanceStatus =
  | "present"
  | "late"
  | "early_leave"
  | "absent"
  | "on_leave"
  | "incomplete"
  | "overtime";

export type LeaveRequestStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "cancelled";

export type CheckMethod = "gps" | "qr" | "manual" | "gps_qr";

export interface Company {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  timezone: string;
  work_start_time: string;
  work_end_time: string;
  late_grace_minutes: number;
  overtime_after_minutes: number;
  gps_required: boolean;
  qr_required: boolean;
  selfie_required: boolean;
  gps_radius_meters: number;
  office_lat: number | null;
  office_lng: number | null;
  theme_default: "light" | "dark" | "system";
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  company_id: string;
  role: UserRole;
  full_name: string;
  phone: string | null;
  email: string | null;
  avatar_url: string | null;
  is_active: boolean;
  expo_push_token: string | null;
  created_at: string;
  updated_at: string;
}

export interface Employee {
  id: string;
  company_id: string;
  user_id: string | null;
  employee_code: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  photo_url: string | null;
  department_id: string | null;
  position_id: string | null;
  hire_date: string | null;
  status: EmployeeStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}
