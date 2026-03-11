export type Role = 'student' | 'teacher';

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: Role;
  learning_goals: string[] | null;
  interests: string[] | null;
  hours_per_day: number | null;
  created_at: string;
}

export interface Subject {
  id: string;
  student_id: string;
  title: string;
  color_code: string | null;
  target_hours: number;
  completed_hours: number | null;
  deadline: string | null;
  difficulty_level: number | null;
  is_custom: boolean | null;
  created_at: string;
}

export type EventStatus = 'pending' | 'completed' | 'missed';

export interface CalendarEvent {
  id: string;
  student_id: string;
  subject_id: string;
  scheduled_date: string;
  duration_minutes: number;
  status: EventStatus | null;
  created_at: string;
}

// DTOs for Onboarding
export interface CompleteProfileDto {
  role: Role;
  learning_goals?: string[];
  interests?: string[];
  hours_per_day?: number;
}
