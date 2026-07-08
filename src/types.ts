/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'admin' | 'manager' | 'carpenter' | 'polish_person';

export interface User {
  id: string; // Firebase Auth UID equivalent
  name: string;
  email: string;
  role: UserRole;
  initials: string; // 2 Chars uppercase, e.g. "SG"
  is_active: boolean;
  last_seen?: string;
  created_at: string;
  created_by?: string;
  phone?: string;
  password?: string; // Mapped password/passcode
  google_linked?: boolean; // If linked to Google single-sign-on
}

export interface Customer {
  id: string; // UUID
  name: string;
  phone: string;
  address?: string;
  notes?: string;
  whatsapp_opt_in: boolean;
  created_at: string;
  created_by: string;
}

export type OrderStage =
  | 'Pending'
  | 'Design'
  | 'Carpentry'
  | 'QC Check 1'
  | 'Polish'
  | 'QC Check 2'
  | 'Ready to Dispatch'
  | 'Dispatched';

export type OrderPriority = 'normal' | 'urgent';

export interface WoodPart {
  id: string;
  part_name: string;
  width: number; // in inches
  breadth: number; // in inches
  length: number; // in feet
  quantity: number;
}

export interface WoodSchedule {
  catalogue_name: string;
  model_name: string;
  size_of_product: string;
  sqft: number;
  image_link?: string;
  parts: WoodPart[];
}

export interface Order {
  id: string; // UUID
  article_no: string; // YY/MM/XX/NNNN
  customer_id: string; // FK to customer
  category: string; // e.g. Bedroom, Living Room, Kitchen
  sub_category: string; // e.g. Wardrobe, Bed, Sofa
  size: string; // 3ft, 4ft, 6ft, Custom
  custom_size?: string;
  finish: string; // e.g. Matte White, Laminate, Wood Grain
  finish_type?: string; // Additional detailed styling from photos
  special_notes?: string;
  design_type: 'Standard' | 'Custom';
  material: string; // e.g. Plywood, Solid Wood, MDF
  color_shade: string; // e.g. Walnut, Teak, Charcoal
  no_of_units: number;
  carpenter_id: string; // FK to users (carpenter)
  carpenter_labour_rate?: number;
  polish_person_id?: string; // FK to users (polish_person)
  polish_labour_rate?: number;
  current_status: OrderStage;
  is_delayed: boolean;
  priority: OrderPriority;
  order_date: string; // YYYY-MM-DD
  delivery_date: string; // YYYY-MM-DD
  internal_notes?: string;
  portal_token: string;
  portal_token_expires: string;
  qr_token: string;
  created_at: string;
  created_by: string;
  updated_at?: string;
  images: Array<{
    id: string;
    url: string;
    type: 'Design Reference' | 'In-Progress' | 'Final';
    uploaded_at: string;
    uploaded_by: string;
  }>;
  wood_schedule?: WoodSchedule;
  carpenter_sub_status?: 'wood_procurement' | 'under_carpentry' | 'completed';
  total_amount?: number;
  advance_paid?: number;
}

export interface StatusLog {
  id: string;
  order_id: string;
  stage: OrderStage;
  changed_by: string; // user id
  changed_by_name: string; // user name to avoid queries
  changed_by_role: UserRole;
  timestamp: string;
  note?: string;
  qc_passed?: boolean | null;
}

// Phase 2 Types for Schema Compliance
export interface Payment {
  id: string;
  order_id: string;
  total_amount: number;
  advance_paid: number;
  balance_due: number; // total - advance
  payment_date: string;
  payment_mode: 'cash' | 'upi' | 'transfer';
  notes?: string;
  created_by: string;
  created_at: string;
}

export interface Material {
  id: string;
  name: string;
  unit: string; // sqft, piece, litre
  qty_in_stock: number;
  reorder_level: number;
  supplier_notes?: string;
  last_updated: string;
  updated_by: string;
}

export interface MaterialUsage {
  id: string;
  order_id: string;
  material_id: string;
  qty_used: number;
  logged_by: string;
  logged_at: string;
}

export interface MessageLog {
  id: string;
  order_id: string;
  customer_id: string;
  type: 'whatsapp' | 'sms';
  status: 'sent' | 'failed' | 'pending';
  content: string;
  sent_at: string;
}

export interface AlertRule {
  id: string;
  stage_name: OrderStage;
  threshold_days: number;
  updated_by: string;
  updated_at: string;
}

export interface AlertLog {
  id: string;
  order_id: string;
  stage: OrderStage;
  days_overdue: number;
  alerted_at: string;
  resolved_at?: string;
}

export interface NotificationItem {
  id: string;
  order_id: string;
  article_no: string;
  category: string;
  sub_category: string;
  old_stage: OrderStage;
  new_stage: OrderStage;
  changed_by_name: string;
  timestamp: string;
  is_read: boolean;
}

export type CRMCustomerStatus =
  | 'New Inquiry'
  | 'Quotation Pending'
  | 'Quotation Sent'
  | 'Follow-up'
  | 'Order Confirmed'
  | 'In Production'
  | 'Delivered'
  | 'Cancelled';

export type CRMCustomerSource = 'Website' | 'Walkin' | 'Social Media' | 'Youtube' | 'Reference';

export interface CRMCustomer {
  id: string; // Auto Generated/UUID
  name: string;
  companyName?: string;
  phone: string;
  whatsappNumber?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  pinCode?: string;
  gstNumber?: string;
  notes?: string;
  preferredContactMethod?: 'Phone' | 'WhatsApp' | 'Email';
  source?: CRMCustomerSource;
  budget?: number;
  status?: CRMCustomerStatus;
  productRequirement?: string;
  timeline?: string;
  created_at: string;
  created_by: string;
}

export interface CRMQuotationItem {
  id: string;
  furnitureItem: string;
  quantity: number;
  material: string;
  dimensions: string;
  unitPrice: number;
  discount: number; // percentage
  gst: number; // percentage
  totalAmount: number;
}

export interface CRMQuotation {
  id: string;
  customer_id: string;
  customer_name: string;
  items: CRMQuotationItem[];
  totalAmount: number;
  validUntil: string;
  notes?: string;
  status: 'Draft' | 'Sent' | 'Approved' | 'Rejected' | 'Expired';
  created_at: string;
  created_by: string;
  estimateNo?: number;
  description?: string;
  termsAndConditions?: string;
}

export interface CRMFollowUp {
  id: string;
  customer_id: string;
  customer_name: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  reminder: string;
  notes?: string;
  status: 'Pending' | 'Completed';
  created_at: string;
  created_by: string;
}

export interface CRMPayment {
  id: string;
  customer_id: string;
  order_id?: string;
  advance_paid: number;
  balance_due: number;
  payment_method: 'Cash' | 'UPI' | 'Bank Transfer';
  transaction_id?: string;
  payment_date: string;
  total_amount: number;
  pending_amount: number;
}

export interface CRMNote {
  id: string;
  customer_id: string;
  author: string;
  timestamp: string;
  note: string;
}

export interface CRMAttachment {
  id: string;
  customer_id: string;
  fileName: string;
  fileType: string;
  fileCategory: 'Design Image' | 'Reference Photo' | 'PDF' | 'CAD Drawing' | 'Invoice' | 'Agreement';
  url: string;
  uploaded_at: string;
  uploaded_by: string;
}

export interface CRMTimelineEvent {
  id: string;
  customer_id: string;
  type: 'customer_created' | 'quotation_sent' | 'quotation_approved' | 'order_created' | 'status_change' | 'payment_logged' | 'note_added' | 'phone_call' | 'whatsapp_msg' | 'email_sent';
  title: string;
  description: string;
  timestamp: string;
  operator: string;
}


