export type UserRole = "admin" | "technician" | "customer";
export type Language = "en" | "pt";
export type Theme = "light" | "dark";
export type TicketStatus = "open" | "closed" | "in_progress" | "in_development";
export type TicketPriority = "high" | "medium" | "low";
export type AttachmentStorage = "LOCAL" | "OCI_OBJECT_STORAGE";

export interface JwtPayload {
  user_id: number;
  name: string;
  role: UserRole;
  exp: number;
  iat: number;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  department: number | null;
  language: Language;
  type: UserRole;
}

export interface Department {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: number;
  name: string;
  description: string | null;
  department: number;
  created_at: string;
  updated_at: string;
}

export interface Ticket {
  id: number;
  title: string;
  description: string | null;
  category: number;
  department: number;
  customer: number;
  assigned_to: number | null;
  status: TicketStatus;
  priority: TicketPriority;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TicketComment {
  id: number;
  ticket: number;
  author: number;
  body: string;
  is_private: boolean;
  created_at: string;
  updated_at: string;
}

export interface TicketAttachment {
  id: number;
  ticket: number;
  comment: number | null;
  file_url: string;
  original_filename: string;
  content_type: string;
  size_bytes: number;
  uploaded_by: number;
  created_at: string;
  updated_at: string;
}

export interface AppConfig {
  id: number;
  app_name: string;
  logo: string | null;
  default_language: Language;
  default_theme: Theme;
  allow_customer_signup: boolean;
  notify_on_comment: boolean;
  notify_on_status_change: boolean;
  notify_on_assignment: boolean;
  auto_close_inactive_tickets: boolean;
  auto_close_after_days: number;
  default_ticket_priority: TicketPriority;
  log_retention_days: number;
  email_notifications_enabled: boolean;
  oci_tenancy_ocid: string | null;
  oci_user_ocid: string | null;
  oci_key_fingerprint: string | null;
  oci_region: string | null;
  oci_compartment_ocid: string | null;
  oci_bucket_name: string | null;
  oci_bucket_namespace: string | null;
  oci_sender_email: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface ApiError {
  [key: string]: string | string[];
}
