// Types TypeScript alignés sur le schéma Supabase (phase 1).
// Ces génériques permettent un typage strict avec supabase-js.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      weddings: {
        Row: Wedding;
        Insert: Partial<Wedding>;
        Update: Partial<Wedding>;
        Relationships: never[];
      };
      wedding_events: {
        Row: WeddingEvent;
        Insert: Partial<WeddingEvent>;
        Update: Partial<WeddingEvent>;
        Relationships: never[];
      };
      sections: {
        Row: Section;
        Insert: Partial<Section>;
        Update: Partial<Section>;
        Relationships: never[];
      };
      guests: {
        Row: Guest;
        Insert: Partial<Guest>;
        Update: Partial<Guest>;
        Relationships: never[];
      };
      attendance: {
        Row: Attendance;
        Insert: Partial<Attendance>;
        Update: Partial<Attendance>;
        Relationships: never[];
      };
      guest_responses: {
        Row: GuestResponse;
        Insert: Partial<GuestResponse>;
        Update: Partial<GuestResponse>;
        Relationships: never[];
      };
      tables_plan: {
        Row: TablePlan;
        Insert: Partial<TablePlan>;
        Update: Partial<TablePlan>;
        Relationships: never[];
      };
      table_assignments: {
        Row: TableAssignment;
        Insert: Partial<TableAssignment>;
        Update: Partial<TableAssignment>;
        Relationships: never[];
      };
      media: {
        Row: Media;
        Insert: Partial<Media>;
        Update: Partial<Media>;
        Relationships: never[];
      };
      testimonials: {
        Row: Testimonial;
        Insert: Partial<Testimonial>;
        Update: Partial<Testimonial>;
        Relationships: never[];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

export interface Wedding {
  id: string;
  slug: string;
  name: string;
  secondary_name: string | null;
  event_type: string | null;
  template: string;
  theme: Json;
  logo: string | null;
  cover_image: string | null;
  contact_phone: string | null;
  access_start: string | null;
  access_end: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WeddingEvent {
  id: string;
  wedding_id: string;
  name: string;
  date: string | null;
  location_title: string | null;
  location_address: string | null;
  location_image: string | null;
  location_maps_url: string | null;
  position: number;
  created_at: string;
}

export interface Section {
  id: string;
  wedding_id: string;
  type: string;
  enabled: boolean;
  position: number;
  title: string | null;
  content: Json;
  created_at: string;
}

export type SectionType =
  | 'cover'
  | 'location'
  | 'countdown'
  | 'program'
  | 'image_video'
  | 'mixed'
  | 'rsvp'
  | 'gallery'
  | 'tables'
  | 'testimonials';

export interface Guest {
  id: string;
  wedding_id: string;
  name: string;
  phone: string | null;
  plus_ones: number;
  invited_events: string[];
  response: Json;
  created_at: string;
}

export type AttendanceStatus = 'pending' | 'present' | 'absent';

export interface Attendance {
  id: string;
  guest_id: string;
  event_id: string;
  status: AttendanceStatus;
  actual_plus_ones: number;
  updated_at: string;
}

export interface GuestResponse {
  id: string;
  guest_id: string;
  question_key: string;
  answer: Json;
  created_at: string;
}

export interface TablePlan {
  id: string;
  wedding_id: string;
  event_id: string | null; // null = commune à tout l'évènement
  name: string;
  capacity: number | null;
  position: number;
  created_at: string;
}

export interface TableAssignment {
  id: string;
  table_id: string;
  guest_id: string;
  created_at: string;
}

export type MediaStatus = 'pending' | 'published' | 'rejected';
export type MediaType = 'image' | 'video';

export interface Media {
  id: string;
  wedding_id: string;
  type: MediaType;
  storage_path: string | null;
  url: string | null;
  uploaded_by: string;
  status: MediaStatus;
  created_at: string;
}

export type TestimonialStatus = 'pending' | 'published' | 'rejected';

export interface Testimonial {
  id: string;
  wedding_id: string;
  guest_id: string | null;
  author: string | null;
  content: string;
  status: TestimonialStatus;
  created_at: string;
}