// src/lib/types.ts

export type Profile = {
  id: string
  email: string
  full_name: string | null
  role: 'admin' | 'manager' | 'operator'
  created_at: string
}

export type Site = {
  id: string
  name: string
  location: string
  status: 'active' | 'inactive'
  manager_email: string | null
  created_at: string
}

export type Asset = {
  id: string
  site_id: string | null
  name: string
  asset_type: string
  status: 'active' | 'maintenance' | 'faulty'
  last_maintenance: string | null
  created_at: string
}

export type Incident = {
  id: string
  site_id: string | null
  incident_type: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string | null
  injuries: number | null
  fatalities: number | null
  cause: string | null
  corrective_actions: string | null
  reported_by_email: string | null
  report_date: string
  status: 'open' | 'investigating' | 'resolved'
  created_at: string
}

export type MaintenanceLog = {
  id: string
  asset_id: string
  maintenance_type: string
  scheduled_date: string
  status: 'pending' | 'completed'
  notes: string | null
  completed_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string | null
}

export type ComplianceIssue = {
  id: string
  title: string
  description: string | null
  site_id: string | null
  due_date: string
  status: 'open' | 'resolved'
  created_by: string | null
  resolved_at: string | null
  created_at: string
  updated_at: string | null
}

export type ActivityLog = {
  id: string
  user_id: string | null
  action: string
  entity_type: string
  entity_id: string | null
  details: Record<string, unknown> | null
  created_at: string
}

export type Hazard = {
  id: string
  site_id: string | null
  title: string
  description: string | null
  category: string
  risk_level: 'low' | 'medium' | 'high' | 'critical'
  control_measures: string | null
  status: 'active' | 'mitigated' | 'closed'
  identified_by: string | null
  created_at: string
  updated_at: string | null
}

export type NearMiss = {
  id: string
  site_id: string | null
  description: string
  location_detail: string | null
  potential_severity: 'low' | 'medium' | 'high' | 'critical'
  immediate_action: string | null
  report_date: string
  status: 'open' | 'investigated' | 'closed'
  reported_by: string | null
  created_at: string
  updated_at: string | null
}

export type ToolboxTalk = {
  id: string
  site_id: string | null
  topic: string
  talk_date: string
  attendee_count: number
  duration_minutes: number
  notes: string | null
  conducted_by: string | null
  created_at: string
  updated_at: string | null
}

export type Permit = {
  id: string
  site_id: string | null
  title: string
  work_type: 'hot_work' | 'confined_space' | 'electrical' | 'excavation' | 'height' | 'general'
  description: string | null
  location_detail: string | null
  start_datetime: string
  end_datetime: string
  status: 'pending' | 'approved' | 'active' | 'completed' | 'cancelled'
  requested_by: string | null
  created_at: string
  updated_at: string | null
}

export type ProductionLog = {
  id: string
  site_id: string | null
  shift: 'day' | 'afternoon' | 'night'
  log_date: string
  tons_extracted: number
  ore_grade: number
  equipment_used: string | null
  workers_on_shift: number
  cost_per_ton: number
  notes: string | null
  logged_by: string | null
  created_at: string
  updated_at: string | null
}

export type DowntimeLog = {
  id: string
  asset_id: string | null
  site_id: string | null
  reason: string | null
  start_time: string
  end_time: string | null
  created_at: string
}
