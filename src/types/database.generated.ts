export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      ai_suggestions: {
        Row: {
          applied_communication_id: string | null
          content: string
          created_at: string
          decided_at: string | null
          decided_by: string | null
          decision_outcome: string | null
          draft_body: string | null
          draft_subject: string | null
          id: string
          lead_id: string
          operator_notes: string | null
          organization_id: string | null
          prompt_context: Json | null
          rationale: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          suggested_by: string | null
          suggestion_type: string
          target_entity_id: string | null
          target_entity_type: string | null
          updated_at: string | null
        }
        Insert: {
          applied_communication_id?: string | null
          content: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_outcome?: string | null
          draft_body?: string | null
          draft_subject?: string | null
          id?: string
          lead_id: string
          operator_notes?: string | null
          organization_id?: string | null
          prompt_context?: Json | null
          rationale?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          suggested_by?: string | null
          suggestion_type: string
          target_entity_id?: string | null
          target_entity_type?: string | null
          updated_at?: string | null
        }
        Update: {
          applied_communication_id?: string | null
          content?: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_outcome?: string | null
          draft_body?: string | null
          draft_subject?: string | null
          id?: string
          lead_id?: string
          operator_notes?: string | null
          organization_id?: string | null
          prompt_context?: Json | null
          rationale?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          suggested_by?: string | null
          suggestion_type?: string
          target_entity_id?: string | null
          target_entity_type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_suggestions_applied_communication_id_fkey"
            columns: ["applied_communication_id"]
            isOneToOne: false
            referencedRelation: "communications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_suggestions_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_suggestions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_suggestions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_suggestions_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_suggestions_suggested_by_fkey"
            columns: ["suggested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          organization_id: string
          payload: Json | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          organization_id: string
          payload?: Json | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          organization_id?: string
          payload?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_checklist_items: {
        Row: {
          code: string
          country_id: string
          created_at: string
          description: string
          id: string
          is_mandatory: boolean
        }
        Insert: {
          code: string
          country_id: string
          created_at?: string
          description: string
          id?: string
          is_mandatory?: boolean
        }
        Update: {
          code?: string
          country_id?: string
          created_at?: string
          description?: string
          id?: string
          is_mandatory?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "compliance_checklist_items_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_line_items: {
        Row: {
          catalog_price_amount: number | null
          catalog_price_currency: string | null
          catalog_price_id: string | null
          continuity_snapshot: Json
          contract_id: string
          created_at: string
          currency: string | null
          id: string
          is_price_overridden: boolean | null
          notes: string | null
          override_reason: string | null
          overridden_at: string | null
          overridden_by: string | null
          product_id: string | null
          product_variant_id: string | null
          quantity: number
          source_quote_line_item_id: string | null
          unit_price: number | null
          updated_at: string
        }
        Insert: {
          catalog_price_amount?: number | null
          catalog_price_currency?: string | null
          catalog_price_id?: string | null
          continuity_snapshot?: Json
          contract_id: string
          created_at?: string
          currency?: string | null
          id?: string
          is_price_overridden?: boolean | null
          notes?: string | null
          override_reason?: string | null
          overridden_at?: string | null
          overridden_by?: string | null
          product_id?: string | null
          product_variant_id?: string | null
          quantity: number
          source_quote_line_item_id?: string | null
          unit_price?: number | null
          updated_at?: string
        }
        Update: {
          catalog_price_amount?: number | null
          catalog_price_currency?: string | null
          catalog_price_id?: string | null
          continuity_snapshot?: Json
          contract_id?: string
          created_at?: string
          currency?: string | null
          id?: string
          is_price_overridden?: boolean | null
          notes?: string | null
          override_reason?: string | null
          overridden_at?: string | null
          overridden_by?: string | null
          product_id?: string | null
          product_variant_id?: string | null
          quantity?: number
          source_quote_line_item_id?: string | null
          unit_price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_line_items_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_line_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          accepted_at: string | null
          approval_required: boolean
          approval_state: string
          approved_at: string | null
          commercial_lock_state: string | null
          commercial_snapshot: Json
          completed_at: string | null
          created_at: string
          dispatched_at: string | null
          ends_on: string | null
          execution_blockers: Json
          execution_snapshot: Json
          execution_state: string
          id: string
          lead_id: string
          locked_at: string | null
          notes: string | null
          organization_id: string
          pricing_basis: string | null
          quote_currency: string | null
          quote_id: string
          ready_at: string | null
          released_at: string | null
          sent_at: string | null
          signed_at: string | null
          starts_on: string | null
          status: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          approval_required?: boolean
          approval_state?: string
          approved_at?: string | null
          commercial_lock_state?: string | null
          commercial_snapshot?: Json
          completed_at?: string | null
          created_at?: string
          dispatched_at?: string | null
          ends_on?: string | null
          execution_blockers?: Json
          execution_snapshot?: Json
          execution_state?: string
          id?: string
          lead_id: string
          locked_at?: string | null
          notes?: string | null
          organization_id: string
          pricing_basis?: string | null
          quote_currency?: string | null
          quote_id: string
          ready_at?: string | null
          released_at?: string | null
          sent_at?: string | null
          signed_at?: string | null
          starts_on?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          approval_required?: boolean
          approval_state?: string
          approved_at?: string | null
          commercial_lock_state?: string | null
          commercial_snapshot?: Json
          completed_at?: string | null
          created_at?: string
          dispatched_at?: string | null
          ends_on?: string | null
          execution_blockers?: Json
          execution_snapshot?: Json
          execution_state?: string
          id?: string
          lead_id?: string
          locked_at?: string | null
          notes?: string | null
          organization_id?: string
          pricing_basis?: string | null
          quote_currency?: string | null
          quote_id?: string
          ready_at?: string | null
          released_at?: string | null
          sent_at?: string | null
          signed_at?: string | null
          starts_on?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      countries: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          iso2_code: string | null
          iso3_code: string | null
          market_id: string
          name: string
          organization_id: string
          phone_code: string | null
          search_aliases: string | null
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          iso2_code?: string | null
          iso3_code?: string | null
          market_id: string
          name: string
          organization_id: string
          phone_code?: string | null
          search_aliases?: string | null
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          iso2_code?: string | null
          iso3_code?: string | null
          market_id?: string
          name?: string
          organization_id?: string
          phone_code?: string | null
          search_aliases?: string | null
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "countries_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "countries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      document_versions: {
        Row: {
          created_at: string
          created_by: string | null
          document_id: string
          file_url: string
          id: string
          version: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          document_id: string
          file_url: string
          id?: string
          version: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          document_id?: string
          file_url?: string
          id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "document_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_versions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          doc_type: string
          file_name: string
          file_url: string
          id: string
          organization_id: string
          related_entity: string
          related_id: string
          status: string
          uploaded_at: string
          uploaded_by: string | null
          version: number
        }
        Insert: {
          doc_type: string
          file_name: string
          file_url: string
          id?: string
          organization_id: string
          related_entity: string
          related_id: string
          status?: string
          uploaded_at?: string
          uploaded_by?: string | null
          version?: number
        }
        Update: {
          doc_type?: string
          file_name?: string
          file_url?: string
          id?: string
          organization_id?: string
          related_entity?: string
          related_id?: string
          status?: string
          uploaded_at?: string
          uploaded_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      exchange_rates: {
        Row: {
          base_currency: string
          effective_at: string
          fetched_at: string
          id: string
          provider: string
          quote_currency: string
          rate: number
        }
        Insert: {
          base_currency: string
          effective_at: string
          fetched_at?: string
          id?: string
          provider: string
          quote_currency: string
          rate: number
        }
        Update: {
          base_currency?: string
          effective_at?: string
          fetched_at?: string
          id?: string
          provider?: string
          quote_currency?: string
          rate?: number
        }
        Relationships: []
      }
      hs_codes: {
        Row: {
          code: string
          created_at: string
          description: string
          id: string
          unit_measure: string | null
        }
        Insert: {
          code: string
          created_at?: string
          description: string
          id?: string
          unit_measure?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          description?: string
          id?: string
          unit_measure?: string | null
        }
        Relationships: []
      }
      hs_duties: {
        Row: {
          country_id: string
          created_at: string
          duty_rate: number
          effective_from: string
          effective_to: string | null
          hs_code_id: string
          id: string
        }
        Insert: {
          country_id: string
          created_at?: string
          duty_rate: number
          effective_from: string
          effective_to?: string | null
          hs_code_id: string
          id?: string
        }
        Update: {
          country_id?: string
          created_at?: string
          duty_rate?: number
          effective_from?: string
          effective_to?: string | null
          hs_code_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hs_duties_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hs_duties_hs_code_id_fkey"
            columns: ["hs_code_id"]
            isOneToOne: false
            referencedRelation: "hs_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_events: {
        Row: {
          created_at: string
          direction: string
          event_type: string
          id: string
          integration_id: string
          payload: Json
          processed_at: string | null
          status: string
        }
        Insert: {
          created_at?: string
          direction: string
          event_type: string
          id?: string
          integration_id: string
          payload: Json
          processed_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          direction?: string
          event_type?: string
          id?: string
          integration_id?: string
          payload?: Json
          processed_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_events_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      integrations: {
        Row: {
          configuration: Json
          created_at: string
          id: string
          is_active: boolean
          organization_id: string
          provider: string
          updated_at: string
        }
        Insert: {
          configuration: Json
          created_at?: string
          id?: string
          is_active?: boolean
          organization_id: string
          provider: string
          updated_at?: string
        }
        Update: {
          configuration?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          organization_id?: string
          provider?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integrations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_activities: {
        Row: {
          actor_user_id: string | null
          created_at: string
          id: string
          kind: string
          lead_id: string
          legacy_activity_id: string | null
          message: string
          occurred_at: string
          organization_id: string
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          id?: string
          kind: string
          lead_id: string
          legacy_activity_id?: string | null
          message: string
          occurred_at?: string
          organization_id: string
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          id?: string
          kind?: string
          lead_id?: string
          legacy_activity_id?: string | null
          message?: string
          occurred_at?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_activities_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_activities_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_assignment_history: {
        Row: {
          assigned_at: string
          changed_by: string | null
          from_user_id: string | null
          id: string
          lead_id: string
          note: string | null
          to_user_id: string | null
        }
        Insert: {
          assigned_at?: string
          changed_by?: string | null
          from_user_id?: string | null
          id?: string
          lead_id: string
          note?: string | null
          to_user_id?: string | null
        }
        Update: {
          assigned_at?: string
          changed_by?: string | null
          from_user_id?: string | null
          id?: string
          lead_id?: string
          note?: string | null
          to_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_assignment_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_assignment_history_from_user_id_fkey"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_assignment_history_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_assignment_history_to_user_id_fkey"
            columns: ["to_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_attachments: {
        Row: {
          attachment_type: string | null
          created_at: string
          file_name: string
          file_size_bytes: number | null
          id: string
          lead_id: string
          legacy_attachment_id: string | null
          legacy_file_url: string | null
          mime_type: string | null
          organization_id: string
          storage_path: string
          uploaded_by: string | null
        }
        Insert: {
          attachment_type?: string | null
          created_at?: string
          file_name: string
          file_size_bytes?: number | null
          id?: string
          lead_id: string
          legacy_attachment_id?: string | null
          legacy_file_url?: string | null
          mime_type?: string | null
          organization_id: string
          storage_path: string
          uploaded_by?: string | null
        }
        Update: {
          attachment_type?: string | null
          created_at?: string
          file_name?: string
          file_size_bytes?: number | null
          id?: string
          lead_id?: string
          legacy_attachment_id?: string | null
          legacy_file_url?: string | null
          mime_type?: string | null
          organization_id?: string
          storage_path?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_attachments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_attachments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_compliance_items: {
        Row: {
          approved_at: string | null
          compliance_item_id: string
          created_at: string
          id: string
          lead_id: string
          status: string
          submitted_at: string | null
        }
        Insert: {
          approved_at?: string | null
          compliance_item_id: string
          created_at?: string
          id?: string
          lead_id: string
          status?: string
          submitted_at?: string | null
        }
        Update: {
          approved_at?: string | null
          compliance_item_id?: string
          created_at?: string
          id?: string
          lead_id?: string
          status?: string
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_compliance_items_compliance_item_id_fkey"
            columns: ["compliance_item_id"]
            isOneToOne: false
            referencedRelation: "compliance_checklist_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_compliance_items_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_follow_ups: {
        Row: {
          assigned_user_id: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          id: string
          lead_id: string
          legacy_follow_up_id: string | null
          notes: string | null
          organization_id: string
          scheduled_at: string
          status: string
        }
        Insert: {
          assigned_user_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          lead_id: string
          legacy_follow_up_id?: string | null
          notes?: string | null
          organization_id: string
          scheduled_at: string
          status?: string
        }
        Update: {
          assigned_user_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          lead_id?: string
          legacy_follow_up_id?: string | null
          notes?: string | null
          organization_id?: string
          scheduled_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_follow_ups_assigned_user_id_fkey"
            columns: ["assigned_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_follow_ups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_follow_ups_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_follow_ups_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_markets: {
        Row: {
          id: string
          lead_id: string
          market_id: string
        }
        Insert: {
          id?: string
          lead_id: string
          market_id: string
        }
        Update: {
          id?: string
          lead_id?: string
          market_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_markets_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_markets_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_playbook_runs: {
        Row: {
          completed_at: string | null
          current_step_id: string | null
          id: string
          lead_id: string
          playbook_id: string
          started_at: string
          status: string
        }
        Insert: {
          completed_at?: string | null
          current_step_id?: string | null
          id?: string
          lead_id: string
          playbook_id: string
          started_at?: string
          status?: string
        }
        Update: {
          completed_at?: string | null
          current_step_id?: string | null
          id?: string
          lead_id?: string
          playbook_id?: string
          started_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_playbook_runs_current_step_id_fkey"
            columns: ["current_step_id"]
            isOneToOne: false
            referencedRelation: "playbook_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_playbook_runs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_playbook_runs_playbook_id_fkey"
            columns: ["playbook_id"]
            isOneToOne: false
            referencedRelation: "playbooks"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_product_interests: {
        Row: {
          created_at: string
          id: string
          interest_type: string
          label: string | null
          lead_id: string
          product_id: string | null
          source_context: Json | null
        }
        Insert: {
          created_at?: string
          id?: string
          interest_type?: string
          label?: string | null
          lead_id: string
          product_id?: string | null
          source_context?: Json | null
        }
        Update: {
          created_at?: string
          id?: string
          interest_type?: string
          label?: string | null
          lead_id?: string
          product_id?: string | null
          source_context?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_product_interests_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_product_interests_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_scores: {
        Row: {
          calculated_by: string | null
          created_at: string
          id: string
          lead_id: string
          rationale: string | null
          score: number
        }
        Insert: {
          calculated_by?: string | null
          created_at?: string
          id?: string
          lead_id: string
          rationale?: string | null
          score: number
        }
        Update: {
          calculated_by?: string | null
          created_at?: string
          id?: string
          lead_id?: string
          rationale?: string | null
          score?: number
        }
        Relationships: [
          {
            foreignKeyName: "lead_scores_calculated_by_fkey"
            columns: ["calculated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_scores_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_stage_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          from_stage_id: string | null
          id: string
          lead_id: string
          note: string | null
          organization_id: string
          to_stage_id: string | null
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          from_stage_id?: string | null
          id?: string
          lead_id: string
          note?: string | null
          organization_id: string
          to_stage_id?: string | null
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          from_stage_id?: string | null
          id?: string
          lead_id?: string
          note?: string | null
          organization_id?: string
          to_stage_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_stage_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_stage_history_from_stage_id_fkey"
            columns: ["from_stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_stage_history_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_stage_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_stage_history_to_stage_id_fkey"
            columns: ["to_stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_tags: {
        Row: {
          id: string
          lead_id: string
          tag_id: string
        }
        Insert: {
          id?: string
          lead_id: string
          tag_id: string
        }
        Update: {
          id?: string
          lead_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_tags_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          company_name: string
          contact_name: string | null
          country: string | null
          country_id: string | null
          created_at: string
          created_by: string | null
          deal_currency: string | null
          deal_value: number | null
          email: string | null
          ex_factory: string | null
          fob: string | null
          id: string
          intro_sent: boolean
          job_title: string | null
          last_contacted_at: string | null
          lead_type: string
          legacy_lead_id: string | null
          market_id: string | null
          next_follow_up_at: string | null
          next_step_id: string | null
          notes: string | null
          organization_id: string
          owner_user_id: string | null
          phone: string | null
          phone_country_code: string | null
          phone_secondary: string | null
          phone_secondary_country_code: string | null
          pipeline_id: string | null
          private_label_mode: string | null
          product_type: string | null
          products_or_needs: string | null
          social_handle: string | null
          source_label: string | null
          source_type: string | null
          stage_id: string | null
          trade_event_id: string | null
          updated_at: string
          updated_by: string | null
          website: string | null
        }
        Insert: {
          company_name: string
          contact_name?: string | null
          country?: string | null
          country_id?: string | null
          created_at?: string
          created_by?: string | null
          deal_currency?: string | null
          deal_value?: number | null
          email?: string | null
          ex_factory?: string | null
          fob?: string | null
          id?: string
          intro_sent?: boolean
          job_title?: string | null
          last_contacted_at?: string | null
          lead_type: string
          legacy_lead_id?: string | null
          market_id?: string | null
          next_follow_up_at?: string | null
          next_step_id?: string | null
          notes?: string | null
          organization_id: string
          owner_user_id?: string | null
          phone?: string | null
          phone_country_code?: string | null
          phone_secondary?: string | null
          phone_secondary_country_code?: string | null
          pipeline_id?: string | null
          private_label_mode?: string | null
          product_type?: string | null
          products_or_needs?: string | null
          social_handle?: string | null
          source_label?: string | null
          source_type?: string | null
          stage_id?: string | null
          trade_event_id?: string | null
          updated_at?: string
          updated_by?: string | null
          website?: string | null
        }
        Update: {
          company_name?: string
          contact_name?: string | null
          country?: string | null
          country_id?: string | null
          created_at?: string
          created_by?: string | null
          deal_currency?: string | null
          deal_value?: number | null
          email?: string | null
          ex_factory?: string | null
          fob?: string | null
          id?: string
          intro_sent?: boolean
          job_title?: string | null
          last_contacted_at?: string | null
          lead_type?: string
          legacy_lead_id?: string | null
          market_id?: string | null
          next_follow_up_at?: string | null
          next_step_id?: string | null
          notes?: string | null
          organization_id?: string
          owner_user_id?: string | null
          phone?: string | null
          phone_country_code?: string | null
          phone_secondary?: string | null
          phone_secondary_country_code?: string | null
          pipeline_id?: string | null
          private_label_mode?: string | null
          product_type?: string | null
          products_or_needs?: string | null
          social_handle?: string | null
          source_label?: string | null
          source_type?: string | null
          stage_id?: string | null
          trade_event_id?: string | null
          updated_at?: string
          updated_by?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_next_step_id_fkey"
            columns: ["next_step_id"]
            isOneToOne: false
            referencedRelation: "next_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_trade_event_id_fkey"
            columns: ["trade_event_id"]
            isOneToOne: false
            referencedRelation: "trade_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      markets: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          market_code: string | null
          name: string
          organization_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          market_code?: string | null
          name: string
          organization_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          market_code?: string | null
          name?: string
          organization_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "markets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      next_steps: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          organization_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "next_steps_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          organization_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          organization_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          organization_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          created_by: string | null
          default_currency: string | null
          id: string
          logo_url: string | null
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          default_currency?: string | null
          id?: string
          logo_url?: string | null
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          default_currency?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organizations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_stages: {
        Row: {
          color: string | null
          created_at: string
          id: string
          is_closed: boolean
          is_lost: boolean
          is_won: boolean
          name: string
          pipeline_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          is_closed?: boolean
          is_lost?: boolean
          is_won?: boolean
          name: string
          pipeline_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          is_closed?: boolean
          is_lost?: boolean
          is_won?: boolean
          name?: string
          pipeline_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_stages_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
        ]
      }
      pipelines: {
        Row: {
          created_at: string
          id: string
          is_default: boolean
          lead_type: string
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean
          lead_type: string
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean
          lead_type?: string
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pipelines_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      playbook_steps: {
        Row: {
          action: string
          created_at: string
          id: string
          parameters: Json | null
          playbook_id: string
          step_order: number
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          parameters?: Json | null
          playbook_id: string
          step_order: number
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          parameters?: Json | null
          playbook_id?: string
          step_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "playbook_steps_playbook_id_fkey"
            columns: ["playbook_id"]
            isOneToOne: false
            referencedRelation: "playbooks"
            referencedColumns: ["id"]
          },
        ]
      }
      playbooks: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "playbooks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playbooks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      product_categories: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          organization_id: string
          parent_id: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          parent_id?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          parent_id?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_categories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      product_prices: {
        Row: {
          created_at: string
          currency: string
          effective_from: string
          effective_to: string | null
          id: string
          market_id: string
          price: number
          product_variant_id: string
        }
        Insert: {
          created_at?: string
          currency: string
          effective_from: string
          effective_to?: string | null
          id?: string
          market_id: string
          price: number
          product_variant_id: string
        }
        Update: {
          created_at?: string
          currency?: string
          effective_from?: string
          effective_to?: string | null
          id?: string
          market_id?: string
          price?: number
          product_variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_prices_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_prices_product_variant_id_fkey"
            columns: ["product_variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          country_of_origin: string | null
          created_at: string
          export_metadata: Json | null
          hs_code_id: string | null
          hsn_code: string | null
          id: string
          is_active: boolean | null
          is_quoteable: boolean | null
          name: string
          net_weight_kg: number | null
          organization_id: string | null
          pack_label: string | null
          packaging_type: string | null
          packaging_unit: string | null
          pricing_mode_default: string | null
          product_id: string
          shipment_attributes: Json | null
          shipment_notes: string | null
          sku_code: string | null
          sort_order: number | null
          source_payload: Json | null
          units_per_case: number | null
        }
        Insert: {
          country_of_origin?: string | null
          created_at?: string
          export_metadata?: Json | null
          hs_code_id?: string | null
          hsn_code?: string | null
          id?: string
          is_active?: boolean | null
          is_quoteable?: boolean | null
          name: string
          net_weight_kg?: number | null
          organization_id?: string | null
          pack_label?: string | null
          packaging_type?: string | null
          packaging_unit?: string | null
          pricing_mode_default?: string | null
          product_id: string
          shipment_attributes?: Json | null
          shipment_notes?: string | null
          sku_code?: string | null
          sort_order?: number | null
          source_payload?: Json | null
          units_per_case?: number | null
        }
        Update: {
          country_of_origin?: string | null
          created_at?: string
          export_metadata?: Json | null
          hs_code_id?: string | null
          hsn_code?: string | null
          id?: string
          is_active?: boolean | null
          is_quoteable?: boolean | null
          name?: string
          net_weight_kg?: number | null
          organization_id?: string | null
          pack_label?: string | null
          packaging_type?: string | null
          packaging_unit?: string | null
          pricing_mode_default?: string | null
          product_id?: string
          shipment_attributes?: Json | null
          shipment_notes?: string | null
          sku_code?: string | null
          sort_order?: number | null
          source_payload?: Json | null
          units_per_case?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_hs_code_id_fkey"
            columns: ["hs_code_id"]
            isOneToOne: false
            referencedRelation: "hs_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          brand_name: string | null
          category_id: string | null
          created_at: string
          description: string | null
          hsn_code: string | null
          id: string
          is_active: boolean
          name: string
          organization_id: string
          pack_size: string | null
          short_code: string | null
          sku: string | null
          sku_code: string | null
          supplier_name: string | null
          updated_at: string
        }
        Insert: {
          brand_name?: string | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          hsn_code?: string | null
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          pack_size?: string | null
          short_code?: string | null
          sku?: string | null
          sku_code?: string | null
          supplier_name?: string | null
          updated_at?: string
        }
        Update: {
          brand_name?: string | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          hsn_code?: string | null
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          pack_size?: string | null
          short_code?: string | null
          sku?: string | null
          sku_code?: string | null
          supplier_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      quote_line_items: {
        Row: {
          created_at: string
          currency: string | null
          id: string
          notes: string | null
          product_id: string | null
          quantity: number
          quote_id: string
          unit_price: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string | null
          id?: string
          notes?: string | null
          product_id?: string | null
          quantity: number
          quote_id: string
          unit_price?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string | null
          id?: string
          notes?: string | null
          product_id?: string | null
          quantity?: number
          quote_id?: string
          unit_price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_line_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_line_items_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          created_at: string
          created_by: string | null
          currency: string | null
          id: string
          lead_id: string
          notes: string | null
          organization_id: string
          rfq_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          currency?: string | null
          id?: string
          lead_id: string
          notes?: string | null
          organization_id: string
          rfq_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          currency?: string | null
          id?: string
          lead_id?: string
          notes?: string | null
          organization_id?: string
          rfq_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_rfq_id_fkey"
            columns: ["rfq_id"]
            isOneToOne: false
            referencedRelation: "rfqs"
            referencedColumns: ["id"]
          },
        ]
      }
      rfq_line_items: {
        Row: {
          created_at: string | null
          currency: string | null
          id: string
          notes: string | null
          product_id: string | null
          quantity: number
          rfq_id: string | null
          unit_price: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          currency?: string | null
          id?: string
          notes?: string | null
          product_id?: string | null
          quantity: number
          rfq_id?: string | null
          unit_price?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          currency?: string | null
          id?: string
          notes?: string | null
          product_id?: string | null
          quantity?: number
          rfq_id?: string | null
          unit_price?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rfq_line_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfq_line_items_rfq_id_fkey"
            columns: ["rfq_id"]
            isOneToOne: false
            referencedRelation: "rfqs"
            referencedColumns: ["id"]
          },
        ]
      }
      rfqs: {
        Row: {
          created_at: string | null
          created_by: string | null
          currency: string | null
          id: string
          lead_id: string | null
          notes: string | null
          organization_id: string
          status: string
          updated_at: string | null
          validity_date: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          organization_id: string
          status?: string
          updated_at?: string | null
          validity_date?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          organization_id?: string
          status?: string
          updated_at?: string | null
          validity_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rfqs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfqs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfqs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          created_at: string
          id: string
          permission: string
          role_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          permission: string
          role_id: string
        }
        Update: {
          created_at?: string
          id?: string
          permission?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          organization_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          organization_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          organization_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_tasks: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string | null
          id: string
          lead_id: string | null
          organization_id: string
          payload: Json
          scheduled_for: string
          status: string
          task_type: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          lead_id?: string | null
          organization_id: string
          payload: Json
          scheduled_for: string
          status?: string
          task_type: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          lead_id?: string | null
          organization_id?: string
          payload?: Json
          scheduled_for?: string
          status?: string
          task_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_tasks_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_tasks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          color: string | null
          id: string
          name: string
          organization_id: string
        }
        Insert: {
          color?: string | null
          id?: string
          name: string
          organization_id: string
        }
        Update: {
          color?: string | null
          id?: string
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tags_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      trade_events: {
        Row: {
          city: string | null
          country: string | null
          created_at: string
          ends_on: string | null
          id: string
          name: string
          notes: string | null
          organization_id: string
          starts_on: string | null
          updated_at: string
        }
        Insert: {
          city?: string | null
          country?: string | null
          created_at?: string
          ends_on?: string | null
          id?: string
          name: string
          notes?: string | null
          organization_id: string
          starts_on?: string | null
          updated_at?: string
        }
        Update: {
          city?: string | null
          country?: string | null
          created_at?: string
          ends_on?: string | null
          id?: string
          name?: string
          notes?: string | null
          organization_id?: string
          starts_on?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trade_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          assigned_at: string | null
          id: string
          organization_member_id: string | null
          role_id: string | null
        }
        Insert: {
          assigned_at?: string | null
          id?: string
          organization_member_id?: string | null
          role_id?: string | null
        }
        Update: {
          assigned_at?: string | null
          id?: string
          organization_member_id?: string | null
          role_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_organization_member_id_fkey"
            columns: ["organization_member_id"]
            isOneToOne: false
            referencedRelation: "organization_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      app_upsert_lead: {
        Args: {
          company_name: string
          contact_name: string
          country: string
          created_by: string
          email: string
          lead_type: string
          market_ids: string[]
          next_follow_up_at: string
          next_step_id: string
          notes: string
          organization_id: string
          owner_user_id: string
          phone: string
          product_ids: string[]
          source_label: string
          stage_id: string
          trade_event_id: string
          updated_by: string
        }
        Returns: undefined
      }
      build_product_sku: {
        Args: {
          p_brand_name: string
          p_category_name: string
          p_pack_size: string
          p_product_name: string
        }
        Returns: string
      }
      is_org_admin: { Args: { org_id: string }; Returns: boolean }
      is_org_member: { Args: { org_id: string }; Returns: boolean }
      mark_overdue_lead_follow_ups_missed: { Args: never; Returns: number }
      numeric_pack_token: { Args: { input_text: string }; Returns: string }
      org_role: { Args: { org_id: string }; Returns: string }
      slug_letters: {
        Args: { input_text: string; letter_count?: number }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
