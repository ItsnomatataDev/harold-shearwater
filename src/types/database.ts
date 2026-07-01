export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      chat_conversations: {
        Row: { id: string; organization_id: string; title: string; created_by: string; conversation_type: "direct" | "group"; direct_key: string | null; source_harold_id: string | null; created_at: string; updated_at: string };
        Insert: { id?: string; organization_id: string; title: string; created_by: string; conversation_type?: "direct" | "group"; direct_key?: string | null; source_harold_id?: string | null; created_at?: string; updated_at?: string };
        Update: { id?: string; organization_id?: string; title?: string; created_by?: string; conversation_type?: "direct" | "group"; direct_key?: string | null; source_harold_id?: string | null; created_at?: string; updated_at?: string };
        Relationships: [];
      };
      chat_messages: {
        Row: { id: string; conversation_id: string; sender_user_id: string; sender_access: Database["public"]["Enums"]["access_type"]; body: string; created_at: string };
        Insert: { id?: string; conversation_id: string; sender_user_id: string; sender_access: Database["public"]["Enums"]["access_type"]; body: string; created_at?: string };
        Update: { id?: string; conversation_id?: string; sender_user_id?: string; sender_access?: Database["public"]["Enums"]["access_type"]; body?: string; created_at?: string };
        Relationships: [];
      };
      chat_participants: {
        Row: { conversation_id: string; user_id: string; access_type: Database["public"]["Enums"]["access_type"]; membership_id: string | null; last_read_at: string | null; joined_at: string };
        Insert: { conversation_id: string; user_id: string; access_type: Database["public"]["Enums"]["access_type"]; membership_id?: string | null; last_read_at?: string | null; joined_at?: string };
        Update: { conversation_id?: string; user_id?: string; access_type?: Database["public"]["Enums"]["access_type"]; membership_id?: string | null; last_read_at?: string | null; joined_at?: string };
        Relationships: [];
      };
      access_memberships: {
        Row: {
          access_type: Database["public"]["Enums"]["access_type"];
          created_at: string;
          department_id: string | null;
          employee_number: string | null;
          id: string;
          invited_by: string | null;
          joined_at: string | null;
          manager_membership_id: string | null;
          organization_id: string | null;
          primary_location_id: string | null;
          status: Database["public"]["Enums"]["membership_status"];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          access_type: Database["public"]["Enums"]["access_type"];
          created_at?: string;
          department_id?: string | null;
          employee_number?: string | null;
          id?: string;
          invited_by?: string | null;
          joined_at?: string | null;
          manager_membership_id?: string | null;
          organization_id?: string | null;
          primary_location_id?: string | null;
          status?: Database["public"]["Enums"]["membership_status"];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          access_type?: Database["public"]["Enums"]["access_type"];
          created_at?: string;
          department_id?: string | null;
          employee_number?: string | null;
          id?: string;
          invited_by?: string | null;
          joined_at?: string | null;
          manager_membership_id?: string | null;
          organization_id?: string | null;
          primary_location_id?: string | null;
          status?: Database["public"]["Enums"]["membership_status"];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "access_memberships_department_id_fkey";
            columns: ["department_id"];
            isOneToOne: false;
            referencedRelation: "departments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "access_memberships_manager_membership_id_fkey";
            columns: ["manager_membership_id"];
            isOneToOne: false;
            referencedRelation: "access_memberships";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "access_memberships_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "access_memberships_primary_location_id_fkey";
            columns: ["primary_location_id"];
            isOneToOne: false;
            referencedRelation: "locations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fk_access_memberships_user_profiles";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      announcements: {
        Row: {
          audience: "everyone" | "team" | "agents" | "managers";
          body: string;
          category: string;
          created_at: string;
          created_by: string;
          expires_at: string | null;
          id: string;
          organization_id: string;
          pinned: boolean;
          published_at: string | null;
          title: string;
          updated_at: string;
        };
        Insert: {
          audience?: "everyone" | "team" | "agents" | "managers";
          body: string;
          category?: string;
          created_at?: string;
          created_by: string;
          expires_at?: string | null;
          id?: string;
          organization_id: string;
          pinned?: boolean;
          published_at?: string | null;
          title: string;
          updated_at?: string;
        };
        Update: {
          audience?: "everyone" | "team" | "agents" | "managers";
          body?: string;
          category?: string;
          created_at?: string;
          created_by?: string;
          expires_at?: string | null;
          id?: string;
          organization_id?: string;
          pinned?: boolean;
          published_at?: string | null;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "announcements_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      attendance_entries: {
        Row: {
          clocked_in_at: string;
          clocked_out_at: string | null;
          created_at: string;
          id: string;
          location_id: string | null;
          membership_id: string;
          organization_id: string;
        };
        Insert: {
          clocked_in_at?: string;
          clocked_out_at?: string | null;
          created_at?: string;
          id?: string;
          location_id?: string | null;
          membership_id: string;
          organization_id: string;
        };
        Update: {
          clocked_in_at?: string;
          clocked_out_at?: string | null;
          created_at?: string;
          id?: string;
          location_id?: string | null;
          membership_id?: string;
          organization_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "attendance_entries_location_id_fkey";
            columns: ["location_id"];
            isOneToOne: false;
            referencedRelation: "locations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "attendance_entries_membership_id_fkey";
            columns: ["membership_id"];
            isOneToOne: false;
            referencedRelation: "access_memberships";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "attendance_entries_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      audit_logs: {
        Row: {
          action: string;
          actor_user_id: string | null;
          created_at: string;
          entity_id: string | null;
          entity_type: string;
          id: number;
          metadata: Json;
          organization_id: string | null;
        };
        Insert: {
          action: string;
          actor_user_id?: string | null;
          created_at?: string;
          entity_id?: string | null;
          entity_type: string;
          id?: never;
          metadata?: Json;
          organization_id?: string | null;
        };
        Update: {
          action?: string;
          actor_user_id?: string | null;
          created_at?: string;
          entity_id?: string | null;
          entity_type?: string;
          id?: never;
          metadata?: Json;
          organization_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "audit_logs_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fk_audit_logs_actor_profiles";
            columns: ["actor_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      departments: {
        Row: {
          active: boolean;
          created_at: string;
          description: string | null;
          id: string;
          name: string;
          organization_id: string;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          description?: string | null;
          id?: string;
          name: string;
          organization_id: string;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          description?: string | null;
          id?: string;
          name?: string;
          organization_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "departments_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      documents: {
        Row: {
          category: string;
          content: string;
          created_at: string;
          created_by: string;
          description: string | null;
          doc_type:
            | "voucher"
            | "confirmation"
            | "itinerary"
            | "contract"
            | "fact_sheet"
            | "policy"
            | "media"
            | "general";
          file_name: string | null;
          file_size_bytes: number | null;
          file_url: string | null;
          id: string;
          linked_id: string | null;
          linked_type: "enquiry" | "product" | "meeting" | "review" | null;
          mime_type: string | null;
          organization_id: string;
          owner_id: string | null;
          owner_type: "team" | "agent" | "customer";
          published_at: string | null;
          status: string;
          title: string;
          updated_at: string;
          uploaded_by: string | null;
        };
        Insert: {
          category: string;
          content?: string;
          created_at?: string;
          created_by: string;
          description?: string | null;
          doc_type?:
            | "voucher"
            | "confirmation"
            | "itinerary"
            | "contract"
            | "fact_sheet"
            | "policy"
            | "media"
            | "general";
          file_name?: string | null;
          file_size_bytes?: number | null;
          file_url?: string | null;
          id?: string;
          linked_id?: string | null;
          linked_type?: "enquiry" | "product" | "meeting" | "review" | null;
          mime_type?: string | null;
          organization_id: string;
          owner_id?: string | null;
          owner_type?: "team" | "agent" | "customer";
          published_at?: string | null;
          status?: string;
          title: string;
          updated_at?: string;
          uploaded_by?: string | null;
        };
        Update: {
          category?: string;
          content?: string;
          created_at?: string;
          created_by?: string;
          description?: string | null;
          doc_type?:
            | "voucher"
            | "confirmation"
            | "itinerary"
            | "contract"
            | "fact_sheet"
            | "policy"
            | "media"
            | "general";
          file_name?: string | null;
          file_size_bytes?: number | null;
          file_url?: string | null;
          id?: string;
          linked_id?: string | null;
          linked_type?: "enquiry" | "product" | "meeting" | "review" | null;
          mime_type?: string | null;
          organization_id?: string;
          owner_id?: string | null;
          owner_type?: "team" | "agent" | "customer";
          published_at?: string | null;
          status?: string;
          title?: string;
          updated_at?: string;
          uploaded_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "documents_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fk_documents_created_by_profiles";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      document_deliveries: {
        Row: { id: string; organization_id: string; document_id: string; recipient_user_id: string; recipient_access: Database["public"]["Enums"]["access_type"]; delivered_by: string | null; read_at: string | null; delivered_at: string };
        Insert: { id?: string; organization_id: string; document_id: string; recipient_user_id: string; recipient_access: Database["public"]["Enums"]["access_type"]; delivered_by?: string | null; read_at?: string | null; delivered_at?: string };
        Update: { id?: string; organization_id?: string; document_id?: string; recipient_user_id?: string; recipient_access?: Database["public"]["Enums"]["access_type"]; delivered_by?: string | null; read_at?: string | null; delivered_at?: string };
        Relationships: [];
      };
      duty_handover_notes: {
        Row: {
          author_membership_id: string;
          body: string;
          created_at: string;
          id: string;
          schedule_id: string;
        };
        Insert: {
          author_membership_id: string;
          body: string;
          created_at?: string;
          id?: string;
          schedule_id: string;
        };
        Update: {
          author_membership_id?: string;
          body?: string;
          created_at?: string;
          id?: string;
          schedule_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "duty_handover_notes_author_membership_id_fkey";
            columns: ["author_membership_id"];
            isOneToOne: false;
            referencedRelation: "access_memberships";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "duty_handover_notes_schedule_id_fkey";
            columns: ["schedule_id"];
            isOneToOne: false;
            referencedRelation: "schedules";
            referencedColumns: ["id"];
          },
        ];
      };
      harold_conversations: {
        Row: {
          assigned_to_membership_id: string | null;
          chat_conversation_id: string | null;
          created_at: string;
          handover_reason: string | null;
          handover_requested_at: string | null;
          handover_requested_by: string | null;
          id: string;
          last_message_at: string;
          organization_id: string;
          resolved_at: string | null;
          source_access: Database["public"]["Enums"]["access_type"];
          status: string;
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          assigned_to_membership_id?: string | null;
          chat_conversation_id?: string | null;
          created_at?: string;
          handover_reason?: string | null;
          handover_requested_at?: string | null;
          handover_requested_by?: string | null;
          id?: string;
          last_message_at?: string;
          organization_id: string;
          resolved_at?: string | null;
          source_access?: Database["public"]["Enums"]["access_type"];
          status?: string;
          title: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          assigned_to_membership_id?: string | null;
          chat_conversation_id?: string | null;
          created_at?: string;
          handover_reason?: string | null;
          handover_requested_at?: string | null;
          handover_requested_by?: string | null;
          id?: string;
          last_message_at?: string;
          organization_id?: string;
          resolved_at?: string | null;
          source_access?: Database["public"]["Enums"]["access_type"];
          status?: string;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "harold_conversations_assigned_to_membership_id_fkey";
            columns: ["assigned_to_membership_id"];
            isOneToOne: false;
            referencedRelation: "access_memberships";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "harold_conversations_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      harold_messages: {
        Row: {
          author_user_id: string | null;
          content: string;
          conversation_id: string;
          created_at: string;
          id: string;
          metadata: Json;
          role: string;
        };
        Insert: {
          author_user_id?: string | null;
          content: string;
          conversation_id: string;
          created_at?: string;
          id?: string;
          metadata?: Json;
          role: string;
        };
        Update: {
          author_user_id?: string | null;
          content?: string;
          conversation_id?: string;
          created_at?: string;
          id?: string;
          metadata?: Json;
          role?: string;
        };
        Relationships: [
          {
            foreignKeyName: "harold_messages_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "harold_conversations";
            referencedColumns: ["id"];
          },
        ];
      };
      invitations: {
        Row: {
          accepted_at: string | null;
          access_type: Database["public"]["Enums"]["access_type"];
          created_at: string;
          email: string;
          expires_at: string;
          id: string;
          invited_by: string;
          organization_id: string;
          role_id: string | null;
          token_hash: string;
        };
        Insert: {
          accepted_at?: string | null;
          access_type: Database["public"]["Enums"]["access_type"];
          created_at?: string;
          email: string;
          expires_at: string;
          id?: string;
          invited_by: string;
          organization_id: string;
          role_id?: string | null;
          token_hash: string;
        };
        Update: {
          accepted_at?: string | null;
          access_type?: Database["public"]["Enums"]["access_type"];
          created_at?: string;
          email?: string;
          expires_at?: string;
          id?: string;
          invited_by?: string;
          organization_id?: string;
          role_id?: string | null;
          token_hash?: string;
        };
        Relationships: [
          {
            foreignKeyName: "invitations_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invitations_role_id_fkey";
            columns: ["role_id"];
            isOneToOne: false;
            referencedRelation: "roles";
            referencedColumns: ["id"];
          },
        ];
      };
      locations: {
        Row: {
          active: boolean;
          address: string | null;
          code: string;
          created_at: string;
          id: string;
          name: string;
          organization_id: string;
          timezone: string;
        };
        Insert: {
          active?: boolean;
          address?: string | null;
          code: string;
          created_at?: string;
          id?: string;
          name: string;
          organization_id: string;
          timezone?: string;
        };
        Update: {
          active?: boolean;
          address?: string | null;
          code?: string;
          created_at?: string;
          id?: string;
          name?: string;
          organization_id?: string;
          timezone?: string;
        };
        Relationships: [
          {
            foreignKeyName: "locations_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      meeting_attendees: {
        Row: {
          meeting_id: string;
          response: string;
          user_id: string;
        };
        Insert: {
          meeting_id: string;
          response?: string;
          user_id: string;
        };
        Update: {
          meeting_id?: string;
          response?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "meeting_attendees_meeting_id_fkey";
            columns: ["meeting_id"];
            isOneToOne: false;
            referencedRelation: "meetings";
            referencedColumns: ["id"];
          },
        ];
      };
      meetings: {
        Row: {
          created_at: string;
          created_by: string;
          description: string | null;
          ended_at: string | null;
          ends_at: string | null;
          id: string;
          location: string | null;
          location_notes: string | null;
          meeting_type:
            | "internal"
            | "briefing"
            | "debrief"
            | "client"
            | "agent"
            | "other";
          notes: string | null;
          notes_approved: boolean;
          organization_id: string;
          scheduled_at: string;
          starts_at: string;
          status: "scheduled" | "in_progress" | "completed" | "cancelled";
          title: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          description?: string | null;
          ended_at?: string | null;
          ends_at?: string | null;
          id?: string;
          location?: string | null;
          location_notes?: string | null;
          meeting_type?:
            | "internal"
            | "briefing"
            | "debrief"
            | "client"
            | "agent"
            | "other";
          notes?: string | null;
          notes_approved?: boolean;
          organization_id: string;
          scheduled_at: string;
          starts_at: string;
          status?: "scheduled" | "in_progress" | "completed" | "cancelled";
          title: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          description?: string | null;
          ended_at?: string | null;
          ends_at?: string | null;
          id?: string;
          location?: string | null;
          location_notes?: string | null;
          meeting_type?:
            | "internal"
            | "briefing"
            | "debrief"
            | "client"
            | "agent"
            | "other";
          notes?: string | null;
          notes_approved?: boolean;
          organization_id?: string;
          scheduled_at?: string;
          starts_at?: string;
          status?: "scheduled" | "in_progress" | "completed" | "cancelled";
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "meetings_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      membership_roles: {
        Row: {
          assigned_at: string;
          assigned_by: string | null;
          membership_id: string;
          role_id: string;
        };
        Insert: {
          assigned_at?: string;
          assigned_by?: string | null;
          membership_id: string;
          role_id: string;
        };
        Update: {
          assigned_at?: string;
          assigned_by?: string | null;
          membership_id?: string;
          role_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "membership_roles_membership_id_fkey";
            columns: ["membership_id"];
            isOneToOne: false;
            referencedRelation: "access_memberships";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "membership_roles_role_id_fkey";
            columns: ["role_id"];
            isOneToOne: false;
            referencedRelation: "roles";
            referencedColumns: ["id"];
          },
        ];
      };
      notification_preferences: {
        Row: {
          access_enabled: boolean;
          announcements_enabled: boolean;
          attendance_enabled: boolean;
          created_at: string;
          email_enabled: boolean;
          in_app_enabled: boolean;
          knowledge_enabled: boolean;
          meetings_enabled: boolean;
          organization_id: string;
          schedules_enabled: boolean;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          access_enabled?: boolean;
          announcements_enabled?: boolean;
          attendance_enabled?: boolean;
          created_at?: string;
          email_enabled?: boolean;
          in_app_enabled?: boolean;
          knowledge_enabled?: boolean;
          meetings_enabled?: boolean;
          organization_id: string;
          schedules_enabled?: boolean;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          access_enabled?: boolean;
          announcements_enabled?: boolean;
          attendance_enabled?: boolean;
          created_at?: string;
          email_enabled?: boolean;
          in_app_enabled?: boolean;
          knowledge_enabled?: boolean;
          meetings_enabled?: boolean;
          organization_id?: string;
          schedules_enabled?: boolean;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notification_preferences_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          body: string;
          category: string;
          created_at: string;
          dedupe_key: string | null;
          entity_id: string | null;
          entity_type: string | null;
          expires_at: string | null;
          href: string | null;
          id: string;
          metadata: Json;
          organization_id: string;
          read_at: string | null;
          recipient_user_id: string;
          title: string;
        };
        Insert: {
          body: string;
          category: string;
          created_at?: string;
          dedupe_key?: string | null;
          entity_id?: string | null;
          entity_type?: string | null;
          expires_at?: string | null;
          href?: string | null;
          id?: string;
          metadata?: Json;
          organization_id: string;
          read_at?: string | null;
          recipient_user_id: string;
          title: string;
        };
        Update: {
          body?: string;
          category?: string;
          created_at?: string;
          dedupe_key?: string | null;
          entity_id?: string | null;
          entity_type?: string | null;
          expires_at?: string | null;
          href?: string | null;
          id?: string;
          metadata?: Json;
          organization_id?: string;
          read_at?: string | null;
          recipient_user_id?: string;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      organizations: {
        Row: {
          active: boolean;
          created_at: string;
          id: string;
          name: string;
          slug: string;
          timezone: string;
          type: Database["public"]["Enums"]["organization_type"];
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          id?: string;
          name: string;
          slug: string;
          timezone?: string;
          type: Database["public"]["Enums"]["organization_type"];
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          id?: string;
          name?: string;
          slug?: string;
          timezone?: string;
          type?: Database["public"]["Enums"]["organization_type"];
          updated_at?: string;
        };
        Relationships: [];
      };
      permissions: {
        Row: {
          created_at: string;
          description: string;
          id: string;
          key: string;
          name: string;
        };
        Insert: {
          created_at?: string;
          description: string;
          id?: string;
          key: string;
          name: string;
        };
        Update: {
          created_at?: string;
          description?: string;
          id?: string;
          key?: string;
          name?: string;
        };
        Relationships: [];
      };
      platform_admins: {
        Row: { email: string; user_id: string | null; active: boolean; created_at: string };
        Insert: { email: string; user_id?: string | null; active?: boolean; created_at?: string };
        Update: { email?: string; user_id?: string | null; active?: boolean; created_at?: string };
        Relationships: [];
      };
      profiles: {
        Row: {
          agency_name: string | null;
          avatar_url: string | null;
          created_at: string;
          email: string;
          first_name: string | null;
          id: string;
          job_title: string | null;
          last_name: string | null;
          phone: string | null;
          timezone: string;
          updated_at: string;
          website: string | null;
        };
        Insert: {
          agency_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          email: string;
          first_name?: string | null;
          id: string;
          job_title?: string | null;
          last_name?: string | null;
          phone?: string | null;
          timezone?: string;
          updated_at?: string;
          website?: string | null;
        };
        Update: {
          agency_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          email?: string;
          first_name?: string | null;
          id?: string;
          job_title?: string | null;
          last_name?: string | null;
          phone?: string | null;
          timezone?: string;
          updated_at?: string;
          website?: string | null;
        };
        Relationships: [];
      };
      role_permissions: {
        Row: {
          permission_id: string;
          role_id: string;
        };
        Insert: {
          permission_id: string;
          role_id: string;
        };
        Update: {
          permission_id?: string;
          role_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey";
            columns: ["permission_id"];
            isOneToOne: false;
            referencedRelation: "permissions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey";
            columns: ["role_id"];
            isOneToOne: false;
            referencedRelation: "roles";
            referencedColumns: ["id"];
          },
        ];
      };
      roles: {
        Row: {
          access_type: Database["public"]["Enums"]["access_type"];
          created_at: string;
          description: string;
          id: string;
          key: string;
          name: string;
          organization_id: string | null;
          system_role: boolean;
        };
        Insert: {
          access_type: Database["public"]["Enums"]["access_type"];
          created_at?: string;
          description: string;
          id?: string;
          key: string;
          name: string;
          organization_id?: string | null;
          system_role?: boolean;
        };
        Update: {
          access_type?: Database["public"]["Enums"]["access_type"];
          created_at?: string;
          description?: string;
          id?: string;
          key?: string;
          name?: string;
          organization_id?: string | null;
          system_role?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "roles_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      schedule_assignments: {
        Row: {
          assigned_at: string;
          assigned_by: string;
          completed_at: string | null;
          membership_id: string;
          schedule_id: string;
          status: string;
        };
        Insert: {
          assigned_at?: string;
          assigned_by: string;
          completed_at?: string | null;
          membership_id: string;
          schedule_id: string;
          status?: string;
        };
        Update: {
          assigned_at?: string;
          assigned_by?: string;
          completed_at?: string | null;
          membership_id?: string;
          schedule_id?: string;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "schedule_assignments_membership_id_fkey";
            columns: ["membership_id"];
            isOneToOne: false;
            referencedRelation: "access_memberships";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "schedule_assignments_schedule_id_fkey";
            columns: ["schedule_id"];
            isOneToOne: false;
            referencedRelation: "schedules";
            referencedColumns: ["id"];
          },
        ];
      };
      schedules: {
        Row: {
          created_at: string;
          created_by: string;
          department_id: string | null;
          description: string | null;
          ends_at: string;
          id: string;
          location_id: string | null;
          organization_id: string;
          shift_template_id: string | null;
          starts_at: string;
          status: string;
          supervisor_membership_id: string | null;
          title: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          department_id?: string | null;
          description?: string | null;
          ends_at: string;
          id?: string;
          location_id?: string | null;
          organization_id: string;
          shift_template_id?: string | null;
          starts_at: string;
          status?: string;
          supervisor_membership_id?: string | null;
          title: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          department_id?: string | null;
          description?: string | null;
          ends_at?: string;
          id?: string;
          location_id?: string | null;
          organization_id?: string;
          shift_template_id?: string | null;
          starts_at?: string;
          status?: string;
          supervisor_membership_id?: string | null;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "schedules_department_id_fkey";
            columns: ["department_id"];
            isOneToOne: false;
            referencedRelation: "departments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "schedules_location_id_fkey";
            columns: ["location_id"];
            isOneToOne: false;
            referencedRelation: "locations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "schedules_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "schedules_shift_template_id_fkey";
            columns: ["shift_template_id"];
            isOneToOne: false;
            referencedRelation: "shift_templates";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "schedules_supervisor_membership_id_fkey";
            columns: ["supervisor_membership_id"];
            isOneToOne: false;
            referencedRelation: "access_memberships";
            referencedColumns: ["id"];
          },
        ];
      };
      shift_templates: {
        Row: {
          active: boolean;
          created_at: string;
          created_by: string;
          department_id: string | null;
          description: string | null;
          end_time: string;
          id: string;
          location_id: string | null;
          name: string;
          organization_id: string;
          start_time: string;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          created_by: string;
          department_id?: string | null;
          description?: string | null;
          end_time: string;
          id?: string;
          location_id?: string | null;
          name: string;
          organization_id: string;
          start_time: string;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          created_by?: string;
          department_id?: string | null;
          description?: string | null;
          end_time?: string;
          id?: string;
          location_id?: string | null;
          name?: string;
          organization_id?: string;
          start_time?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "shift_templates_department_id_fkey";
            columns: ["department_id"];
            isOneToOne: false;
            referencedRelation: "departments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "shift_templates_location_id_fkey";
            columns: ["location_id"];
            isOneToOne: false;
            referencedRelation: "locations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "shift_templates_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      tasks: {
        Row: {
          assigned_to: string | null;
          completed_at: string | null;
          context: string | null;
          created_at: string;
          created_by: string;
          description: string | null;
          due_at: string | null;
          id: string;
          organization_id: string;
          priority: Database["public"]["Enums"]["task_priority"];
          status: Database["public"]["Enums"]["task_status"];
          title: string;
          updated_at: string;
        };
        Insert: {
          assigned_to?: string | null;
          completed_at?: string | null;
          context?: string | null;
          created_at?: string;
          created_by: string;
          description?: string | null;
          due_at?: string | null;
          id?: string;
          organization_id: string;
          priority?: Database["public"]["Enums"]["task_priority"];
          status?: Database["public"]["Enums"]["task_status"];
          title: string;
          updated_at?: string;
        };
        Update: {
          assigned_to?: string | null;
          completed_at?: string | null;
          context?: string | null;
          created_at?: string;
          created_by?: string;
          description?: string | null;
          due_at?: string | null;
          id?: string;
          organization_id?: string;
          priority?: Database["public"]["Enums"]["task_priority"];
          status?: Database["public"]["Enums"]["task_status"];
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fk_tasks_assigned_to_profiles";
            columns: ["assigned_to"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fk_tasks_created_by_profiles";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tasks_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      team_members: {
        Row: {
          is_lead: boolean;
          joined_at: string;
          membership_id: string;
          team_id: string;
        };
        Insert: {
          is_lead?: boolean;
          joined_at?: string;
          membership_id: string;
          team_id: string;
        };
        Update: {
          is_lead?: boolean;
          joined_at?: string;
          membership_id?: string;
          team_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "team_members_membership_id_fkey";
            columns: ["membership_id"];
            isOneToOne: false;
            referencedRelation: "access_memberships";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "team_members_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
        ];
      };
      teams: {
        Row: {
          active: boolean;
          created_at: string;
          department_id: string | null;
          description: string | null;
          id: string;
          name: string;
          organization_id: string;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          department_id?: string | null;
          description?: string | null;
          id?: string;
          name: string;
          organization_id: string;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          department_id?: string | null;
          description?: string | null;
          id?: string;
          name?: string;
          organization_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "teams_department_id_fkey";
            columns: ["department_id"];
            isOneToOne: false;
            referencedRelation: "departments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "teams_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      crm_contacts: {
        Row: {
          id: string;
          organization_id: string;
          first_name: string;
          last_name: string;
          email: string | null;
          phone: string | null;
          nationality: string | null;
          source:
            | "direct"
            | "agent"
            | "harold_chat"
            | "referral"
            | "walk_in"
            | "website"
            | "other"
            | null;
          source_detail: string | null;
          status:
            | "lead"
            | "prospect"
            | "active"
            | "past_guest"
            | "vip"
            | "lost";
          owner_membership_id: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          first_name: string;
          last_name?: string;
          email?: string | null;
          phone?: string | null;
          nationality?: string | null;
          source?:
            | "direct"
            | "agent"
            | "harold_chat"
            | "referral"
            | "walk_in"
            | "website"
            | "other"
            | null;
          source_detail?: string | null;
          status?:
            | "lead"
            | "prospect"
            | "active"
            | "past_guest"
            | "vip"
            | "lost";
          owner_membership_id?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          first_name?: string;
          last_name?: string;
          email?: string | null;
          phone?: string | null;
          nationality?: string | null;
          source?:
            | "direct"
            | "agent"
            | "harold_chat"
            | "referral"
            | "walk_in"
            | "website"
            | "other"
            | null;
          source_detail?: string | null;
          status?:
            | "lead"
            | "prospect"
            | "active"
            | "past_guest"
            | "vip"
            | "lost";
          owner_membership_id?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "crm_contacts_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "crm_contacts_owner_membership_id_fkey";
            columns: ["owner_membership_id"];
            isOneToOne: false;
            referencedRelation: "access_memberships";
            referencedColumns: ["id"];
          },
        ];
      };
      crm_activities: {
        Row: {
          id: string;
          organization_id: string;
          contact_id: string;
          membership_id: string | null;
          type: "note" | "call" | "email" | "meeting" | "task" | "harold_chat";
          body: string;
          occurred_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          contact_id: string;
          membership_id?: string | null;
          type: "note" | "call" | "email" | "meeting" | "task" | "harold_chat";
          body: string;
          occurred_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          contact_id?: string;
          membership_id?: string | null;
          type?: "note" | "call" | "email" | "meeting" | "task" | "harold_chat";
          body?: string;
          occurred_at?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "crm_activities_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "crm_activities_contact_id_fkey";
            columns: ["contact_id"];
            isOneToOne: false;
            referencedRelation: "crm_contacts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "crm_activities_membership_id_fkey";
            columns: ["membership_id"];
            isOneToOne: false;
            referencedRelation: "access_memberships";
            referencedColumns: ["id"];
          },
        ];
      };
      crm_deals: {
        Row: {
          id: string;
          organization_id: string;
          contact_id: string;
          owner_membership_id: string | null;
          title: string;
          value: number | null;
          currency: string;
          stage: "enquiry" | "quoted" | "confirmed" | "complete" | "lost";
          close_date: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          contact_id: string;
          owner_membership_id?: string | null;
          title: string;
          value?: number | null;
          currency?: string;
          stage?: "enquiry" | "quoted" | "confirmed" | "complete" | "lost";
          close_date?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          contact_id?: string;
          owner_membership_id?: string | null;
          title?: string;
          value?: number | null;
          currency?: string;
          stage?: "enquiry" | "quoted" | "confirmed" | "complete" | "lost";
          close_date?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "crm_deals_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "crm_deals_contact_id_fkey";
            columns: ["contact_id"];
            isOneToOne: false;
            referencedRelation: "crm_contacts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "crm_deals_owner_membership_id_fkey";
            columns: ["owner_membership_id"];
            isOneToOne: false;
            referencedRelation: "access_memberships";
            referencedColumns: ["id"];
          },
        ];
      };
      agent_enquiries: {
        Row: {
          id: string;
          organization_id: string;
          membership_id: string | null;
          contact_name: string;
          contact_email: string | null;
          contact_phone: string | null;
          completed_at: string | null;
          external_booking_reference: string | null;
          golden_dusk_booking_id: number | null;
          golden_dusk_reservation_status: string | null;
          golden_dusk_payment_status: string | null;
          golden_dusk_snapshot: Json;
          golden_dusk_synced_at: string | null;
          follow_up_at: string | null;
          hold_expires_at: string | null;
          party_size: number;
          product_interest: string | null;
          quote_amount: number | null;
          quote_currency: string;
          reference: string;
          requested_date: string | null;
          notes: string | null;
          status:
            | "new"
            | "qualifying"
            | "quote_requested"
            | "quoted"
            | "reservation_requested"
            | "on_hold"
            | "confirmed"
            | "complete"
            | "cancelled";
          last_contact_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          membership_id?: string | null;
          contact_name: string;
          contact_email?: string | null;
          contact_phone?: string | null;
          completed_at?: string | null;
          external_booking_reference?: string | null;
          golden_dusk_booking_id?: number | null;
          golden_dusk_reservation_status?: string | null;
          golden_dusk_payment_status?: string | null;
          golden_dusk_snapshot?: Json;
          golden_dusk_synced_at?: string | null;
          follow_up_at?: string | null;
          hold_expires_at?: string | null;
          party_size?: number;
          product_interest?: string | null;
          quote_amount?: number | null;
          quote_currency?: string;
          reference?: string;
          requested_date?: string | null;
          notes?: string | null;
          status?:
            | "new"
            | "qualifying"
            | "quote_requested"
            | "quoted"
            | "reservation_requested"
            | "on_hold"
            | "confirmed"
            | "complete"
            | "cancelled";
          last_contact_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          membership_id?: string | null;
          contact_name?: string;
          contact_email?: string | null;
          contact_phone?: string | null;
          completed_at?: string | null;
          external_booking_reference?: string | null;
          golden_dusk_booking_id?: number | null;
          golden_dusk_reservation_status?: string | null;
          golden_dusk_payment_status?: string | null;
          golden_dusk_snapshot?: Json;
          golden_dusk_synced_at?: string | null;
          follow_up_at?: string | null;
          hold_expires_at?: string | null;
          party_size?: number;
          product_interest?: string | null;
          quote_amount?: number | null;
          quote_currency?: string;
          reference?: string;
          requested_date?: string | null;
          notes?: string | null;
          status?:
            | "new"
            | "qualifying"
            | "quote_requested"
            | "quoted"
            | "reservation_requested"
            | "on_hold"
            | "confirmed"
            | "complete"
            | "cancelled";
          last_contact_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "agent_enquiries_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "agent_enquiries_membership_id_fkey";
            columns: ["membership_id"];
            isOneToOne: false;
            referencedRelation: "access_memberships";
            referencedColumns: ["id"];
          },
        ];
      };
      agent_enquiry_events: {
        Row: {
          actor_membership_id: string | null;
          body: string;
          created_at: string;
          enquiry_id: string;
          event_type:
            | "created"
            | "note"
            | "status_changed"
            | "email"
            | "document"
            | "quote"
            | "reservation"
            | "review"
            | "upsell";
          id: string;
          metadata: Json;
          organization_id: string;
        };
        Insert: {
          actor_membership_id?: string | null;
          body: string;
          created_at?: string;
          enquiry_id: string;
          event_type:
            | "created"
            | "note"
            | "status_changed"
            | "email"
            | "document"
            | "quote"
            | "reservation"
            | "review"
            | "upsell";
          id?: string;
          metadata?: Json;
          organization_id: string;
        };
        Update: {
          actor_membership_id?: string | null;
          body?: string;
          created_at?: string;
          enquiry_id?: string;
          event_type?:
            | "created"
            | "note"
            | "status_changed"
            | "email"
            | "document"
            | "quote"
            | "reservation"
            | "review"
            | "upsell";
          id?: string;
          metadata?: Json;
          organization_id?: string;
        };
        Relationships: [];
      };
      agent_enquiry_followups: {
        Row: {
          completed_at: string | null;
          created_at: string;
          due_at: string | null;
          enquiry_id: string;
          id: string;
          kind: "general" | "post_sale" | "review" | "upsell";
          membership_id: string | null;
          notes: string | null;
          organization_id: string;
          status: "open" | "completed" | "cancelled";
          title: string;
          updated_at: string;
        };
        Insert: {
          completed_at?: string | null;
          created_at?: string;
          due_at?: string | null;
          enquiry_id: string;
          id?: string;
          kind?: "general" | "post_sale" | "review" | "upsell";
          membership_id?: string | null;
          notes?: string | null;
          organization_id: string;
          status?: "open" | "completed" | "cancelled";
          title: string;
          updated_at?: string;
        };
        Update: {
          completed_at?: string | null;
          created_at?: string;
          due_at?: string | null;
          enquiry_id?: string;
          id?: string;
          kind?: "general" | "post_sale" | "review" | "upsell";
          membership_id?: string | null;
          notes?: string | null;
          organization_id?: string;
          status?: "open" | "completed" | "cancelled";
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      inbox_threads: {
        Row: {
          id: string;
          organization_id: string;
          membership_id: string;
          subject: string;
          context_type: "enquiry" | "booking" | "document" | "general" | null;
          context_id: string | null;
          status: "open" | "archived";
          last_message_at: string;
          unread_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          membership_id: string;
          subject: string;
          context_type?: "enquiry" | "booking" | "document" | "general" | null;
          context_id?: string | null;
          status?: "open" | "archived";
          last_message_at?: string;
          unread_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          membership_id?: string;
          subject?: string;
          context_type?: "enquiry" | "booking" | "document" | "general" | null;
          context_id?: string | null;
          status?: "open" | "archived";
          last_message_at?: string;
          unread_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      inbox_messages: {
        Row: {
          id: string;
          organization_id: string;
          thread_id: string;
          sender_id: string | null;
          direction: "inbound" | "outbound" | "internal";
          body: string;
          doc_url: string | null;
          doc_name: string | null;
          doc_mime_type: string | null;
          is_system: boolean;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          thread_id: string;
          sender_id?: string | null;
          direction: "inbound" | "outbound" | "internal";
          body: string;
          doc_url?: string | null;
          doc_name?: string | null;
          doc_mime_type?: string | null;
          is_system?: boolean;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          thread_id?: string;
          sender_id?: string | null;
          direction?: "inbound" | "outbound" | "internal";
          body?: string;
          doc_url?: string | null;
          doc_name?: string | null;
          doc_mime_type?: string | null;
          is_system?: boolean;
          read_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      products: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          slug: string;
          short_description: string | null;
          full_description: string | null;
          category:
            | "adventure"
            | "scenic"
            | "water"
            | "cultural"
            | "multi_activity"
            | "transfer"
            | "accommodation";
          status: "draft" | "active" | "archived";
          min_party_size: number;
          max_party_size: number | null;
          duration_minutes: number | null;
          location_id: string | null;
          cover_image_url: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          slug: string;
          short_description?: string | null;
          full_description?: string | null;
          category?:
            | "adventure"
            | "scenic"
            | "water"
            | "cultural"
            | "multi_activity"
            | "transfer"
            | "accommodation";
          status?: "draft" | "active" | "archived";
          min_party_size?: number;
          max_party_size?: number | null;
          duration_minutes?: number | null;
          location_id?: string | null;
          cover_image_url?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          slug?: string;
          short_description?: string | null;
          full_description?: string | null;
          category?:
            | "adventure"
            | "scenic"
            | "water"
            | "cultural"
            | "multi_activity"
            | "transfer"
            | "accommodation";
          status?: "draft" | "active" | "archived";
          min_party_size?: number;
          max_party_size?: number | null;
          duration_minutes?: number | null;
          location_id?: string | null;
          cover_image_url?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      product_variants: {
        Row: {
          id: string;
          product_id: string;
          name: string;
          description: string | null;
          sort_order: number;
          active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          name: string;
          description?: string | null;
          sort_order?: number;
          active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          name?: string;
          description?: string | null;
          sort_order?: number;
          active?: boolean;
        };
        Relationships: [];
      };
      product_inclusions: {
        Row: {
          id: string;
          product_id: string;
          label: string;
          inclusion_type:
            | "included"
            | "excluded"
            | "requirement"
            | "restriction";
          sort_order: number;
        };
        Insert: {
          id?: string;
          product_id: string;
          label: string;
          inclusion_type?:
            | "included"
            | "excluded"
            | "requirement"
            | "restriction";
          sort_order?: number;
        };
        Update: {
          id?: string;
          product_id?: string;
          label?: string;
          inclusion_type?:
            | "included"
            | "excluded"
            | "requirement"
            | "restriction";
          sort_order?: number;
        };
        Relationships: [];
      };
      rate_plans: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          description: string | null;
          plan_type:
            | "public"
            | "agent_default"
            | "agency_specific"
            | "staff"
            | "promotional";
          valid_from: string | null;
          valid_until: string | null;
          active: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          description?: string | null;
          plan_type?:
            | "public"
            | "agent_default"
            | "agency_specific"
            | "staff"
            | "promotional";
          valid_from?: string | null;
          valid_until?: string | null;
          active?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          description?: string | null;
          plan_type?:
            | "public"
            | "agent_default"
            | "agency_specific"
            | "staff"
            | "promotional";
          valid_from?: string | null;
          valid_until?: string | null;
          active?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      rate_plan_items: {
        Row: {
          id: string;
          rate_plan_id: string;
          product_id: string;
          variant_id: string | null;
          price_per_person: number;
          currency: string;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          rate_plan_id: string;
          product_id: string;
          variant_id?: string | null;
          price_per_person: number;
          currency?: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          rate_plan_id?: string;
          product_id?: string;
          variant_id?: string | null;
          price_per_person?: number;
          currency?: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      agency_rate_assignments: {
        Row: {
          id: string;
          organization_id: string;
          membership_id: string;
          rate_plan_id: string;
          assigned_by: string | null;
          assigned_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          membership_id: string;
          rate_plan_id: string;
          assigned_by?: string | null;
          assigned_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          membership_id?: string;
          rate_plan_id?: string;
          assigned_by?: string | null;
          assigned_at?: string;
        };
        Relationships: [];
      };
      meeting_participants: {
        Row: {
          id: string;
          meeting_id: string;
          membership_id: string;
          role: "host" | "attendee" | "optional";
          attended: boolean | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          meeting_id: string;
          membership_id: string;
          role?: "host" | "attendee" | "optional";
          attended?: boolean | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          meeting_id?: string;
          membership_id?: string;
          role?: "host" | "attendee" | "optional";
          attended?: boolean | null;
        };
        Relationships: [];
      };
      meeting_actions: {
        Row: {
          id: string;
          meeting_id: string;
          title: string;
          assignee_id: string | null;
          due_date: string | null;
          status: "open" | "done" | "cancelled";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          meeting_id: string;
          title: string;
          assignee_id?: string | null;
          due_date?: string | null;
          status?: "open" | "done" | "cancelled";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          meeting_id?: string;
          title?: string;
          assignee_id?: string | null;
          due_date?: string | null;
          status?: "open" | "done" | "cancelled";
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      reviews: {
        Row: {
          id: string;
          organization_id: string;
          product_id: string | null;
          customer_name: string;
          customer_email: string | null;
          rating: number;
          title: string | null;
          body: string | null;
          source:
            | "direct"
            | "google"
            | "tripadvisor"
            | "booking"
            | "agent_submitted"
            | "imported";
          status: "pending" | "published" | "hidden";
          visit_date: string | null;
          response: string | null;
          responded_by: string | null;
          responded_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          product_id?: string | null;
          customer_name: string;
          customer_email?: string | null;
          rating: number;
          title?: string | null;
          body?: string | null;
          source?:
            | "direct"
            | "google"
            | "tripadvisor"
            | "booking"
            | "agent_submitted"
            | "imported";
          status?: "pending" | "published" | "hidden";
          visit_date?: string | null;
          response?: string | null;
          responded_by?: string | null;
          responded_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          product_id?: string | null;
          customer_name?: string;
          customer_email?: string | null;
          rating?: number;
          title?: string | null;
          body?: string | null;
          source?:
            | "direct"
            | "google"
            | "tripadvisor"
            | "booking"
            | "agent_submitted"
            | "imported";
          status?: "pending" | "published" | "hidden";
          visit_date?: string | null;
          response?: string | null;
          responded_by?: string | null;
          responded_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      accept_team_invitation: { Args: { raw_token: string }; Returns: string };
      assign_role_to_member: {
        Args: {
          target_membership_id: string;
          target_organization_id: string;
          target_role_id: string;
        };
        Returns: undefined;
      };
      claim_harold_handover: {
        Args: { target_conversation_id: string; target_membership_id: string };
        Returns: undefined;
      };
      has_permission: {
        Args: { required_permission: string; target_organization_id: string };
        Returns: boolean;
      };
      is_platform_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
      request_harold_handover: {
        Args: { requested_reason?: string; target_conversation_id: string };
        Returns: undefined;
      };
      resolve_harold_handover: {
        Args: { target_conversation_id: string; target_membership_id: string };
        Returns: undefined;
      };
      start_direct_chat: {
        Args: { target_membership_id: string };
        Returns: string;
      };
    };
    Enums: {
      access_type: "team" | "agent" | "customer";
      membership_status: "invited" | "active" | "suspended";
      organization_type: "shearwater" | "agency";
      task_priority: "low" | "medium" | "high" | "urgent";
      task_status: "open" | "in_progress" | "completed" | "cancelled";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      access_type: ["team", "agent", "customer"],
      membership_status: ["invited", "active", "suspended"],
      organization_type: ["shearwater", "agency"],
      task_priority: ["low", "medium", "high", "urgent"],
      task_status: ["open", "in_progress", "completed", "cancelled"],
    },
  },
} as const;
