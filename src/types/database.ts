// Types TypeScript alignés sur le schéma Supabase.
// Le type `Database` utilise des types littéraux "inline" (format exact
// de `supabase gen types`) : requis par supabase-js pour que le schéma
// satisfasse GenerERIC `GenericSchema` (les `interface` ne sont pas
// assignables à `Record<string, unknown>`).

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

// ---------------------------------------------------------------------
// Modèles (interfaces exportées pour les composants)
// ---------------------------------------------------------------------

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
  owner_user_id: string | null;
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

// ---------------------------------------------------------------------
// Schéma Supabase (format `supabase gen types`, types littéraux inline)
// ---------------------------------------------------------------------

export type Database = {
  public: {
    Tables: {
      weddings: {
        Row: {
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
          owner_user_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          slug: string;
          name: string;
          secondary_name?: string | null;
          event_type?: string | null;
          template?: string;
          theme?: Json;
          logo?: string | null;
          cover_image?: string | null;
          contact_phone?: string | null;
          access_start?: string | null;
          access_end?: string | null;
          is_active?: boolean;
          owner_user_id?: string | null;
        };
        Update: {
          slug?: string;
          name?: string;
          secondary_name?: string | null;
          event_type?: string | null;
          template?: string;
          theme?: Json;
          logo?: string | null;
          cover_image?: string | null;
          contact_phone?: string | null;
          access_start?: string | null;
          access_end?: string | null;
          is_active?: boolean;
          owner_user_id?: string | null;
        };
        Relationships: [];
      };
      wedding_events: {
        Row: {
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
        };
        Insert: {
          wedding_id: string;
          name: string;
          date?: string | null;
          location_title?: string | null;
          location_address?: string | null;
          location_image?: string | null;
          location_maps_url?: string | null;
          position?: number;
        };
        Update: {
          name?: string;
          date?: string | null;
          location_title?: string | null;
          location_address?: string | null;
          location_image?: string | null;
          location_maps_url?: string | null;
          position?: number;
        };
        Relationships: [];
      };
      sections: {
        Row: {
          id: string;
          wedding_id: string;
          type: string;
          enabled: boolean;
          position: number;
          title: string | null;
          content: Json;
          created_at: string;
        };
        Insert: {
          wedding_id: string;
          type: string;
          enabled?: boolean;
          position?: number;
          title?: string | null;
          content?: Json;
        };
        Update: {
          type?: string;
          enabled?: boolean;
          position?: number;
          title?: string | null;
          content?: Json;
        };
        Relationships: [];
      };
      guests: {
        Row: {
          id: string;
          wedding_id: string;
          name: string;
          phone: string | null;
          plus_ones: number;
          invited_events: string[];
          response: Json;
          created_at: string;
        };
        Insert: {
          wedding_id: string;
          name: string;
          phone?: string | null;
          plus_ones?: number;
          invited_events?: string[];
          response?: Json;
        };
        Update: {
          name?: string;
          phone?: string | null;
          plus_ones?: number;
          invited_events?: string[];
          response?: Json;
        };
        Relationships: [];
      };
      attendance: {
        Row: {
          id: string;
          guest_id: string;
          event_id: string;
          status: string;
          actual_plus_ones: number;
          updated_at: string;
        };
        Insert: {
          guest_id: string;
          event_id: string;
          status?: string;
          actual_plus_ones?: number;
        };
        Update: {
          status?: string;
          actual_plus_ones?: number;
        };
        Relationships: [];
      };
      guest_responses: {
        Row: {
          id: string;
          guest_id: string;
          question_key: string;
          answer: Json;
          created_at: string;
        };
        Insert: {
          guest_id: string;
          question_key: string;
          answer?: Json;
        };
        Update: {
          answer?: Json;
        };
        Relationships: [];
      };
      tables_plan: {
        Row: {
          id: string;
          wedding_id: string;
          event_id: string | null;
          name: string;
          capacity: number | null;
          position: number;
          created_at: string;
        };
        Insert: {
          wedding_id: string;
          name: string;
          event_id?: string | null;
          capacity?: number | null;
          position?: number;
        };
        Update: {
          name?: string;
          event_id?: string | null;
          capacity?: number | null;
          position?: number;
        };
        Relationships: [];
      };
      table_assignments: {
        Row: {
          id: string;
          table_id: string;
          guest_id: string;
          created_at: string;
        };
        Insert: {
          table_id: string;
          guest_id: string;
        };
        Update: {
          table_id?: string;
          guest_id?: string;
        };
        Relationships: [];
      };
      media: {
        Row: {
          id: string;
          wedding_id: string;
          type: string;
          storage_path: string | null;
          url: string | null;
          uploaded_by: string;
          status: string;
          created_at: string;
        };
        Insert: {
          wedding_id: string;
          type?: string;
          storage_path?: string | null;
          url?: string | null;
          uploaded_by?: string;
          status?: string;
        };
        Update: {
          type?: string;
          storage_path?: string | null;
          url?: string | null;
          uploaded_by?: string;
          status?: string;
        };
        Relationships: [];
      };
      testimonials: {
        Row: {
          id: string;
          wedding_id: string;
          guest_id: string | null;
          author: string | null;
          content: string;
          status: string;
          created_at: string;
        };
        Insert: {
          wedding_id: string;
          guest_id?: string | null;
          author?: string | null;
          content: string;
          status?: string;
        };
        Update: {
          guest_id?: string | null;
          author?: string | null;
          content?: string;
          status?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      claim_wedding: {
        Args: { p_slug: string };
        Returns: string;
      };
    };
    Enums: Record<string, never>;
  };
};