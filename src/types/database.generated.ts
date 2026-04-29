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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
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
          organization_id: string
          prompt_context: Json
          rationale: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          suggested_by: string | null
          suggestion_type: string
          target_entity_id: string | null
          target_entity_type: string | null
          updated_at: string
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
          organization_id: string
          prompt_context?: Json
          rationale?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          suggested_by?: string | null
          suggestion_type: string
          target_entity_id?: string | null
          target_entity_type?: string | null
          updated_at?: string
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
          organization_id?: string
          prompt_context?: Json
          rationale?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          suggested_by?: string | null
          suggestion_type?: string
          target_entity_id?: string | null
          target_entity_type?: string | null
          updated_at?: string
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
      communications: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          body: string | null
          channel: string
          communication_type: string
          created_at: string
          created_by: string | null
          direction: string
          draft_source: string
          id: string
          lead_id: string | null
          metadata: Json
          organization_id: string
          provider_message_id: string | null
          provider_payload: Json
          quote_id: string | null
          related_entity: string
          related_id: string | null
          rfq_id: string | null
          scheduled_at: string | null
          sent_at: string | null
          status: string
          subject: string | null
          summary: string | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          body?: string | null
          channel?: string
          communication_type?: string
          created_at?: string
          created_by?: string | null
          direction?: string
          draft_source?: string
          id?: string
          lead_id?: string | null
          metadata?: Json
          organization_id: string
          provider_message_id?: string | null
          provider_payload?: Json
          quote_id?: string | null
          related_entity?: string
          related_id?: string | null
          rfq_id?: string | null
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          subject?: string | null
          summary?: string | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          body?: string | null
          channel?: string
          communication_type?: string
          created_at?: string
          created_by?: string | null
          direction?: string
          draft_source?: string
          id?: string
          lead_id?: string | null
          metadata?: Json
          organization_id?: string
          provider_message_id?: string | null
          provider_payload?: Json
          quote_id?: string | null
          related_entity?: string
          related_id?: string | null
          rfq_id?: string | null
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          subject?: string | null
          summary?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "communications_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communications_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communications_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communications_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communications_rfq_id_fkey"
            columns: ["rfq_id"]
            isOneToOne: false
            referencedRelation: "rfqs"
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
          continuity_source_mode: string
          contract_id: string
          created_at: string
          currency: string | null
          id: string
          is_price_overridden: boolean
          notes: string | null
          organization_id: string
          overridden_at: string | null
          overridden_by: string | null
          override_reason: string | null
          product_id: string | null
          product_variant_id: string | null
          quantity: number
          source_quote_line_item_id: string | null
          source_quote_version_line_item_id: string | null
          unit_price: number | null
          updated_at: string
        }
        Insert: {
          catalog_price_amount?: number | null
          catalog_price_currency?: string | null
          catalog_price_id?: string | null
          continuity_snapshot?: Json
          continuity_source_mode?: string
          contract_id: string
          created_at?: string
          currency?: string | null
          id?: string
          is_price_overridden?: boolean
          notes?: string | null
          organization_id: string
          overridden_at?: string | null
          overridden_by?: string | null
          override_reason?: string | null
          product_id?: string | null
          product_variant_id?: string | null
          quantity: number
          source_quote_line_item_id?: string | null
          source_quote_version_line_item_id?: string | null
          unit_price?: number | null
          updated_at?: string
        }
        Update: {
          catalog_price_amount?: number | null
          catalog_price_currency?: string | null
          catalog_price_id?: string | null
          continuity_snapshot?: Json
          continuity_source_mode?: string
          contract_id?: string
          created_at?: string
          currency?: string | null
          id?: string
          is_price_overridden?: boolean
          notes?: string | null
          organization_id?: string
          overridden_at?: string | null
          overridden_by?: string | null
          override_reason?: string | null
          product_id?: string | null
          product_variant_id?: string | null
          quantity?: number
          source_quote_line_item_id?: string | null
          source_quote_version_line_item_id?: string | null
          unit_price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_line_items_catalog_price_id_fkey"
            columns: ["catalog_price_id"]
            isOneToOne: false
            referencedRelation: "product_prices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_line_items_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_line_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_line_items_overridden_by_fkey"
            columns: ["overridden_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_line_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_line_items_product_variant_id_fkey"
            columns: ["product_variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          accepted_at: string | null
          accepted_quote_version_id: string | null
          approval_required: boolean
          approval_state: string
          approved_at: string | null
          commercial_handoff_at: string | null
          commercial_lock_state: string | null
          commercial_snapshot: Json
          commercial_snapshot_mode: string
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
          accepted_quote_version_id?: string | null
          approval_required?: boolean
          approval_state?: string
          approved_at?: string | null
          commercial_handoff_at?: string | null
          commercial_lock_state?: string | null
          commercial_snapshot?: Json
          commercial_snapshot_mode?: string
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
          accepted_quote_version_id?: string | null
          approval_required?: boolean
          approval_state?: string
          approved_at?: string | null
          commercial_handoff_at?: string | null
          commercial_lock_state?: string | null
          commercial_snapshot?: Json
          commercial_snapshot_mode?: string
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
      document_requirement_rules: {
        Row: {
          applies_to_entity: string
          created_at: string
          doc_type: string | null
          id: string
          is_active: boolean
          is_mandatory: boolean
          lead_type: string | null
          market_id: string | null
          organization_id: string
          product_id: string | null
          progression_scope: string
          requirement_code: string
          title: string | null
          updated_at: string
        }
        Insert: {
          applies_to_entity?: string
          created_at?: string
          doc_type?: string | null
          id?: string
          is_active?: boolean
          is_mandatory?: boolean
          lead_type?: string | null
          market_id?: string | null
          organization_id: string
          product_id?: string | null
          progression_scope?: string
          requirement_code: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          applies_to_entity?: string
          created_at?: string
          doc_type?: string | null
          id?: string
          is_active?: boolean
          is_mandatory?: boolean
          lead_type?: string | null
          market_id?: string | null
          organization_id?: string
          product_id?: string | null
          progression_scope?: string
          requirement_code?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_requirement_rules_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_requirement_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_requirement_rules_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
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
          expires_at: string | null
          file_name: string
          file_url: string
          id: string
          organization_id: string
          owner_user_id: string | null
          related_entity: string
          related_id: string
          requirement_code: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewer_user_id: string | null
          status: string
          uploaded_at: string
          uploaded_by: string | null
          version: number
          version_label: string | null
        }
        Insert: {
          doc_type: string
          expires_at?: string | null
          file_name: string
          file_url: string
          id?: string
          organization_id: string
          owner_user_id?: string | null
          related_entity: string
          related_id: string
          requirement_code?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewer_user_id?: string | null
          status?: string
          uploaded_at?: string
          uploaded_by?: string | null
          version?: number
          version_label?: string | null
        }
        Update: {
          doc_type?: string
          expires_at?: string | null
          file_name?: string
          file_url?: string
          id?: string
          organization_id?: string
          owner_user_id?: string | null
          related_entity?: string
          related_id?: string
          requirement_code?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewer_user_id?: string | null
          status?: string
          uploaded_at?: string
          uploaded_by?: string | null
          version?: number
          version_label?: string | null
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
            foreignKeyName: "documents_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_reviewer_user_id_fkey"
            columns: ["reviewer_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      freight_calc_assumptions: {
        Row: {
          bags_per_case: number | null
          cases_per_pallet: number | null
          chips_mode: string | null
          chips_ship_qty: number | null
          created_at: string
          freight_profile_id: string
          id: string
          kg_per_pallet: number | null
          pallets_per_20ft: number | null
          pallets_per_40ft: number | null
          powders_mode: string | null
          powders_ship_qty: number | null
          twenty_ft_factor: number | null
          updated_at: string
        }
        Insert: {
          bags_per_case?: number | null
          cases_per_pallet?: number | null
          chips_mode?: string | null
          chips_ship_qty?: number | null
          created_at?: string
          freight_profile_id: string
          id?: string
          kg_per_pallet?: number | null
          pallets_per_20ft?: number | null
          pallets_per_40ft?: number | null
          powders_mode?: string | null
          powders_ship_qty?: number | null
          twenty_ft_factor?: number | null
          updated_at?: string
        }
        Update: {
          bags_per_case?: number | null
          cases_per_pallet?: number | null
          chips_mode?: string | null
          chips_ship_qty?: number | null
          created_at?: string
          freight_profile_id?: string
          id?: string
          kg_per_pallet?: number | null
          pallets_per_20ft?: number | null
          pallets_per_40ft?: number | null
          powders_mode?: string | null
          powders_ship_qty?: number | null
          twenty_ft_factor?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "freight_calc_assumptions_freight_profile_id_fkey"
            columns: ["freight_profile_id"]
            isOneToOne: false
            referencedRelation: "freight_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      freight_profile_items: {
        Row: {
          amount: number
          applies_to_container_type: string | null
          created_at: string
          freight_profile_id: string
          id: string
          input_currency: string
          is_active: boolean
          line_no: number
          particular: string
          updated_at: string
        }
        Insert: {
          amount: number
          applies_to_container_type?: string | null
          created_at?: string
          freight_profile_id: string
          id?: string
          input_currency: string
          is_active?: boolean
          line_no: number
          particular: string
          updated_at?: string
        }
        Update: {
          amount?: number
          applies_to_container_type?: string | null
          created_at?: string
          freight_profile_id?: string
          id?: string
          input_currency?: string
          is_active?: boolean
          line_no?: number
          particular?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "freight_profile_items_freight_profile_id_fkey"
            columns: ["freight_profile_id"]
            isOneToOne: false
            referencedRelation: "freight_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      freight_profiles: {
        Row: {
          country_id: string | null
          created_at: string
          created_by: string | null
          destination_port: string
          id: string
          market_id: string | null
          name: string
          notes: string | null
          organization_id: string
          status: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          country_id?: string | null
          created_at?: string
          created_by?: string | null
          destination_port: string
          id?: string
          market_id?: string | null
          name: string
          notes?: string | null
          organization_id: string
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          country_id?: string | null
          created_at?: string
          created_by?: string | null
          destination_port?: string
          id?: string
          market_id?: string | null
          name?: string
          notes?: string | null
          organization_id?: string
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "freight_profiles_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "freight_profiles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "freight_profiles_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "freight_profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "freight_profiles_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      import_issues: {
        Row: {
          blocking_flag: boolean
          created_at: string
          entity_subtype: string | null
          entity_type: string
          field_name: string | null
          id: string
          import_run_id: string
          issue_code: string
          issue_message: string
          normalized_value: string | null
          severity: string
          source_file_name: string | null
          source_row_no: number | null
          source_sheet_name: string | null
          source_value: string | null
          suggested_fix: string | null
        }
        Insert: {
          blocking_flag?: boolean
          created_at?: string
          entity_subtype?: string | null
          entity_type: string
          field_name?: string | null
          id?: string
          import_run_id: string
          issue_code: string
          issue_message: string
          normalized_value?: string | null
          severity: string
          source_file_name?: string | null
          source_row_no?: number | null
          source_sheet_name?: string | null
          source_value?: string | null
          suggested_fix?: string | null
        }
        Update: {
          blocking_flag?: boolean
          created_at?: string
          entity_subtype?: string | null
          entity_type?: string
          field_name?: string | null
          id?: string
          import_run_id?: string
          issue_code?: string
          issue_message?: string
          normalized_value?: string | null
          severity?: string
          source_file_name?: string | null
          source_row_no?: number | null
          source_sheet_name?: string | null
          source_value?: string | null
          suggested_fix?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "import_issues_import_run_id_fkey"
            columns: ["import_run_id"]
            isOneToOne: false
            referencedRelation: "import_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      import_normalization_rules: {
        Row: {
          action: string
          created_at: string
          id: string
          is_active: boolean
          master_table: string
          normalized_value: string | null
          notes: string | null
          organization_id: string
          source_value: string
          updated_at: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          is_active?: boolean
          master_table: string
          normalized_value?: string | null
          notes?: string | null
          organization_id: string
          source_value: string
          updated_at?: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          is_active?: boolean
          master_table?: string
          normalized_value?: string | null
          notes?: string | null
          organization_id?: string
          source_value?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "import_normalization_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      import_runs: {
        Row: {
          completed_at: string | null
          id: string
          import_type: string
          organization_id: string
          rows_blocked: number
          rows_inserted: number
          rows_read: number
          rows_updated: number
          rows_valid: number
          rows_warning: number
          source_file_checksum: string | null
          source_file_name: string | null
          started_at: string
          started_by: string | null
          status: string
          summary_payload: Json
        }
        Insert: {
          completed_at?: string | null
          id?: string
          import_type: string
          organization_id: string
          rows_blocked?: number
          rows_inserted?: number
          rows_read?: number
          rows_updated?: number
          rows_valid?: number
          rows_warning?: number
          source_file_checksum?: string | null
          source_file_name?: string | null
          started_at?: string
          started_by?: string | null
          status?: string
          summary_payload?: Json
        }
        Update: {
          completed_at?: string | null
          id?: string
          import_type?: string
          organization_id?: string
          rows_blocked?: number
          rows_inserted?: number
          rows_read?: number
          rows_updated?: number
          rows_valid?: number
          rows_warning?: number
          source_file_checksum?: string | null
          source_file_name?: string | null
          started_at?: string
          started_by?: string | null
          status?: string
          summary_payload?: Json
        }
        Relationships: [
          {
            foreignKeyName: "import_runs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_runs_started_by_fkey"
            columns: ["started_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          blocked_stage: string | null
          compliance_item_id: string
          created_at: string
          document_id: string | null
          due_at: string | null
          id: string
          lead_id: string
          organization_id: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewer_user_id: string | null
          severity: string | null
          status: string
          submitted_at: string | null
        }
        Insert: {
          approved_at?: string | null
          blocked_stage?: string | null
          compliance_item_id: string
          created_at?: string
          document_id?: string | null
          due_at?: string | null
          id?: string
          lead_id: string
          organization_id?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewer_user_id?: string | null
          severity?: string | null
          status?: string
          submitted_at?: string | null
        }
        Update: {
          approved_at?: string | null
          blocked_stage?: string | null
          compliance_item_id?: string
          created_at?: string
          document_id?: string | null
          due_at?: string | null
          id?: string
          lead_id?: string
          organization_id?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewer_user_id?: string | null
          severity?: string | null
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
            foreignKeyName: "lead_compliance_items_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_compliance_items_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_compliance_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_compliance_items_reviewer_user_id_fkey"
            columns: ["reviewer_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          organization_id: string
        }
        Insert: {
          id?: string
          lead_id: string
          market_id: string
          organization_id: string
        }
        Update: {
          id?: string
          lead_id?: string
          market_id?: string
          organization_id?: string
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
          {
            foreignKeyName: "lead_markets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
          organization_id: string
          product_id: string | null
          source_context: Json
        }
        Insert: {
          created_at?: string
          id?: string
          interest_type?: string
          label?: string | null
          lead_id: string
          organization_id: string
          product_id?: string | null
          source_context?: Json
        }
        Update: {
          created_at?: string
          id?: string
          interest_type?: string
          label?: string | null
          lead_id?: string
          organization_id?: string
          product_id?: string | null
          source_context?: Json
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
            foreignKeyName: "lead_product_interests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
      my_card_settings: {
        Row: {
          address: string | null
          booking_url: string | null
          created_at: string
          facebook_url: string | null
          id: string
          instagram_url: string | null
          is_public: boolean
          linkedin_url: string | null
          organization_id: string | null
          primary_phone: string | null
          quote_url: string | null
          secondary_phone: string | null
          share_slug: string
          tiktok_url: string | null
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
          address?: string | null
          booking_url?: string | null
          created_at?: string
          facebook_url?: string | null
          id?: string
          instagram_url?: string | null
          is_public?: boolean
          linkedin_url?: string | null
          organization_id?: string | null
          primary_phone?: string | null
          quote_url?: string | null
          secondary_phone?: string | null
          share_slug: string
          tiktok_url?: string | null
          updated_at?: string
          user_id: string
          website?: string | null
        }
        Update: {
          address?: string | null
          booking_url?: string | null
          created_at?: string
          facebook_url?: string | null
          id?: string
          instagram_url?: string | null
          is_public?: boolean
          linkedin_url?: string | null
          organization_id?: string | null
          primary_phone?: string | null
          quote_url?: string | null
          secondary_phone?: string | null
          share_slug?: string
          tiktok_url?: string | null
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "my_card_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "my_card_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
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
      organization_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string | null
          id: string
          invited_by_membership_id: string
          last_sent_at: string | null
          metadata: Json
          organization_id: string
          revoked_at: string | null
          role_id: string | null
          status: string
          token_hash: string | null
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string | null
          id?: string
          invited_by_membership_id: string
          last_sent_at?: string | null
          metadata?: Json
          organization_id: string
          revoked_at?: string | null
          role_id?: string | null
          status?: string
          token_hash?: string | null
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string | null
          id?: string
          invited_by_membership_id?: string
          last_sent_at?: string | null
          metadata?: Json
          organization_id?: string
          revoked_at?: string | null
          role_id?: string | null
          status?: string
          token_hash?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_invitations_invited_by_membership_id_fkey"
            columns: ["invited_by_membership_id"]
            isOneToOne: false
            referencedRelation: "organization_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_invitations_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
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
          approval_threshold_pct: number | null
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
          approval_threshold_pct?: number | null
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
          approval_threshold_pct?: number | null
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
      pricing_engine_settings: {
        Row: {
          allow_manual_fx: boolean
          approval_threshold_percent: number | null
          created_at: string
          default_display_currency: string
          default_fx_base_currency: string
          default_template_both_id: string | null
          default_template_chips_id: string | null
          default_template_powders_id: string | null
          default_validity_days: number
          organization_id: string
          require_approval_for_override: boolean
          updated_at: string
        }
        Insert: {
          allow_manual_fx?: boolean
          approval_threshold_percent?: number | null
          created_at?: string
          default_display_currency?: string
          default_fx_base_currency?: string
          default_template_both_id?: string | null
          default_template_chips_id?: string | null
          default_template_powders_id?: string | null
          default_validity_days?: number
          organization_id: string
          require_approval_for_override?: boolean
          updated_at?: string
        }
        Update: {
          allow_manual_fx?: boolean
          approval_threshold_percent?: number | null
          created_at?: string
          default_display_currency?: string
          default_fx_base_currency?: string
          default_template_both_id?: string | null
          default_template_chips_id?: string | null
          default_template_powders_id?: string | null
          default_validity_days?: number
          organization_id?: string
          require_approval_for_override?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pricing_engine_settings_default_template_both_id_fkey"
            columns: ["default_template_both_id"]
            isOneToOne: false
            referencedRelation: "quote_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_engine_settings_default_template_chips_id_fkey"
            columns: ["default_template_chips_id"]
            isOneToOne: false
            referencedRelation: "quote_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_engine_settings_default_template_powders_id_fkey"
            columns: ["default_template_powders_id"]
            isOneToOne: false
            referencedRelation: "quote_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_engine_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_rule_sets: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          fx_base_currency: string
          fx_provider: string | null
          fx_snapshot_payload: Json
          fx_week_end: string | null
          fx_week_start: string | null
          id: string
          import_status: string | null
          imported_sheet_names: Json
          is_default: boolean
          name: string
          organization_id: string
          source_file_checksum: string | null
          source_file_name: string | null
          source_reference: string | null
          source_type: string
          status: string
          total_rows_failed: number
          total_rows_imported: number
          total_rows_processed: number
          updated_at: string
          updated_by: string | null
          validation_summary: Json
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          fx_base_currency?: string
          fx_provider?: string | null
          fx_snapshot_payload?: Json
          fx_week_end?: string | null
          fx_week_start?: string | null
          id?: string
          import_status?: string | null
          imported_sheet_names?: Json
          is_default?: boolean
          name: string
          organization_id: string
          source_file_checksum?: string | null
          source_file_name?: string | null
          source_reference?: string | null
          source_type?: string
          status?: string
          total_rows_failed?: number
          total_rows_imported?: number
          total_rows_processed?: number
          updated_at?: string
          updated_by?: string | null
          validation_summary?: Json
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          fx_base_currency?: string
          fx_provider?: string | null
          fx_snapshot_payload?: Json
          fx_week_end?: string | null
          fx_week_start?: string | null
          id?: string
          import_status?: string | null
          imported_sheet_names?: Json
          is_default?: boolean
          name?: string
          organization_id?: string
          source_file_checksum?: string | null
          source_file_name?: string | null
          source_reference?: string | null
          source_type?: string
          status?: string
          total_rows_failed?: number
          total_rows_imported?: number
          total_rows_processed?: number
          updated_at?: string
          updated_by?: string | null
          validation_summary?: Json
        }
        Relationships: [
          {
            foreignKeyName: "pricing_rule_sets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_rule_sets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_rule_sets_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      product_pricing_rules: {
        Row: {
          brand_name: string | null
          bulk_ex_factory_inr_per_kg: number | null
          bulk_ex_factory_usd_per_kg: number | null
          bulk_input_amount_per_kg: number | null
          bulk_input_currency: string | null
          bulk_usd_per_kg: number | null
          category_name: string | null
          category_type: string
          created_at: string
          created_by: string | null
          effective_from: string
          effective_to: string | null
          ex_factory_input_amount: number | null
          ex_factory_input_currency: string | null
          ex_factory_inr: number | null
          ex_factory_usd: number | null
          ex_factory_usd_per_case: number | null
          ex_factory_usd_per_unit: number | null
          fob_input_amount: number | null
          fob_input_currency: string | null
          fob_inr: number | null
          fob_usd: number | null
          fob_usd_per_case: number | null
          fob_usd_per_unit: number | null
          fx_provider: string | null
          fx_rate_to_usd: number | null
          fx_reference_week_end: string | null
          fx_reference_week_start: string | null
          fx_source_currency: string | null
          hsn_code: string | null
          id: string
          is_active: boolean
          is_quoteable: boolean
          moq: number | null
          organization_id: string
          pack_label: string | null
          pricing_rule_set_id: string
          pricing_type: string | null
          product_id: string | null
          product_name: string
          product_variant_id: string | null
          raw_source_payload: Json
          raw_source_row_no: number | null
          sku_code: string
          sort_order: number
          source_hash: string | null
          source_sheet_name: string | null
          units_per_case: number | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          brand_name?: string | null
          bulk_ex_factory_inr_per_kg?: number | null
          bulk_ex_factory_usd_per_kg?: number | null
          bulk_input_amount_per_kg?: number | null
          bulk_input_currency?: string | null
          bulk_usd_per_kg?: number | null
          category_name?: string | null
          category_type: string
          created_at?: string
          created_by?: string | null
          effective_from?: string
          effective_to?: string | null
          ex_factory_input_amount?: number | null
          ex_factory_input_currency?: string | null
          ex_factory_inr?: number | null
          ex_factory_usd?: number | null
          ex_factory_usd_per_case?: number | null
          ex_factory_usd_per_unit?: number | null
          fob_input_amount?: number | null
          fob_input_currency?: string | null
          fob_inr?: number | null
          fob_usd?: number | null
          fob_usd_per_case?: number | null
          fob_usd_per_unit?: number | null
          fx_provider?: string | null
          fx_rate_to_usd?: number | null
          fx_reference_week_end?: string | null
          fx_reference_week_start?: string | null
          fx_source_currency?: string | null
          hsn_code?: string | null
          id?: string
          is_active?: boolean
          is_quoteable?: boolean
          moq?: number | null
          organization_id: string
          pack_label?: string | null
          pricing_rule_set_id: string
          pricing_type?: string | null
          product_id?: string | null
          product_name: string
          product_variant_id?: string | null
          raw_source_payload?: Json
          raw_source_row_no?: number | null
          sku_code: string
          sort_order?: number
          source_hash?: string | null
          source_sheet_name?: string | null
          units_per_case?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          brand_name?: string | null
          bulk_ex_factory_inr_per_kg?: number | null
          bulk_ex_factory_usd_per_kg?: number | null
          bulk_input_amount_per_kg?: number | null
          bulk_input_currency?: string | null
          bulk_usd_per_kg?: number | null
          category_name?: string | null
          category_type?: string
          created_at?: string
          created_by?: string | null
          effective_from?: string
          effective_to?: string | null
          ex_factory_input_amount?: number | null
          ex_factory_input_currency?: string | null
          ex_factory_inr?: number | null
          ex_factory_usd?: number | null
          ex_factory_usd_per_case?: number | null
          ex_factory_usd_per_unit?: number | null
          fob_input_amount?: number | null
          fob_input_currency?: string | null
          fob_inr?: number | null
          fob_usd?: number | null
          fob_usd_per_case?: number | null
          fob_usd_per_unit?: number | null
          fx_provider?: string | null
          fx_rate_to_usd?: number | null
          fx_reference_week_end?: string | null
          fx_reference_week_start?: string | null
          fx_source_currency?: string | null
          hsn_code?: string | null
          id?: string
          is_active?: boolean
          is_quoteable?: boolean
          moq?: number | null
          organization_id?: string
          pack_label?: string | null
          pricing_rule_set_id?: string
          pricing_type?: string | null
          product_id?: string | null
          product_name?: string
          product_variant_id?: string | null
          raw_source_payload?: Json
          raw_source_row_no?: number | null
          sku_code?: string
          sort_order?: number
          source_hash?: string | null
          source_sheet_name?: string | null
          units_per_case?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_pricing_rules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_pricing_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_pricing_rules_pricing_rule_set_id_fkey"
            columns: ["pricing_rule_set_id"]
            isOneToOne: false
            referencedRelation: "pricing_rule_sets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_pricing_rules_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_pricing_rules_product_variant_id_fkey"
            columns: ["product_variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_pricing_rules_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          brand_name: string | null
          country_of_origin: string | null
          created_at: string
          created_by: string | null
          export_metadata: Json
          hs_code_id: string | null
          hsn_code: string | null
          hsn_confidence_score: number | null
          hsn_source: string | null
          id: string
          is_active: boolean
          is_quoteable: boolean
          moq_cases: number | null
          moq_kg: number | null
          name: string
          net_weight_kg: number | null
          organization_id: string | null
          pack_label: string | null
          pack_size_unit: string | null
          pack_size_value: number | null
          packaging_type: string | null
          packaging_unit: string | null
          pricing_mode_default: string | null
          product_id: string
          shipment_attributes: Json
          shipment_notes: string | null
          sku_code: string | null
          sort_order: number
          source_payload: Json
          source_row_no: number | null
          source_sheet_name: string | null
          supports_bulk_pricing: boolean
          units_per_case: number | null
          updated_at: string
          updated_by: string | null
          variant_code: string | null
        }
        Insert: {
          brand_name?: string | null
          country_of_origin?: string | null
          created_at?: string
          created_by?: string | null
          export_metadata?: Json
          hs_code_id?: string | null
          hsn_code?: string | null
          hsn_confidence_score?: number | null
          hsn_source?: string | null
          id?: string
          is_active?: boolean
          is_quoteable?: boolean
          moq_cases?: number | null
          moq_kg?: number | null
          name: string
          net_weight_kg?: number | null
          organization_id?: string | null
          pack_label?: string | null
          pack_size_unit?: string | null
          pack_size_value?: number | null
          packaging_type?: string | null
          packaging_unit?: string | null
          pricing_mode_default?: string | null
          product_id: string
          shipment_attributes?: Json
          shipment_notes?: string | null
          sku_code?: string | null
          sort_order?: number
          source_payload?: Json
          source_row_no?: number | null
          source_sheet_name?: string | null
          supports_bulk_pricing?: boolean
          units_per_case?: number | null
          updated_at?: string
          updated_by?: string | null
          variant_code?: string | null
        }
        Update: {
          brand_name?: string | null
          country_of_origin?: string | null
          created_at?: string
          created_by?: string | null
          export_metadata?: Json
          hs_code_id?: string | null
          hsn_code?: string | null
          hsn_confidence_score?: number | null
          hsn_source?: string | null
          id?: string
          is_active?: boolean
          is_quoteable?: boolean
          moq_cases?: number | null
          moq_kg?: number | null
          name?: string
          net_weight_kg?: number | null
          organization_id?: string | null
          pack_label?: string | null
          pack_size_unit?: string | null
          pack_size_value?: number | null
          packaging_type?: string | null
          packaging_unit?: string | null
          pricing_mode_default?: string | null
          product_id?: string
          shipment_attributes?: Json
          shipment_notes?: string | null
          sku_code?: string | null
          sort_order?: number
          source_payload?: Json
          source_row_no?: number | null
          source_sheet_name?: string | null
          supports_bulk_pricing?: boolean
          units_per_case?: number | null
          updated_at?: string
          updated_by?: string | null
          variant_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variants_hs_code_id_fkey"
            columns: ["hs_code_id"]
            isOneToOne: false
            referencedRelation: "hs_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variants_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variants_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          brand_name: string | null
          category_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          hsn_code: string | null
          id: string
          is_active: boolean
          name: string
          organization_id: string
          pack_size: string | null
          pricing_type: string | null
          product_family_code: string | null
          short_code: string | null
          sku: string | null
          sku_code: string | null
          sort_order: number
          supplier_name: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          brand_name?: string | null
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          hsn_code?: string | null
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          pack_size?: string | null
          pricing_type?: string | null
          product_family_code?: string | null
          short_code?: string | null
          sku?: string | null
          sku_code?: string | null
          sort_order?: number
          supplier_name?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          brand_name?: string | null
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          hsn_code?: string | null
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          pack_size?: string | null
          pricing_type?: string | null
          product_family_code?: string | null
          short_code?: string | null
          sku?: string | null
          sku_code?: string | null
          sort_order?: number
          supplier_name?: string | null
          updated_at?: string
          updated_by?: string | null
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
            foreignKeyName: "products_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          catalog_price_amount: number | null
          catalog_price_currency: string | null
          catalog_price_id: string | null
          created_at: string
          currency: string | null
          id: string
          is_price_overridden: boolean
          notes: string | null
          overridden_at: string | null
          overridden_by: string | null
          override_reason: string | null
          product_id: string | null
          product_variant_id: string | null
          quantity: number
          quote_id: string
          unit_price: number | null
          updated_at: string
        }
        Insert: {
          catalog_price_amount?: number | null
          catalog_price_currency?: string | null
          catalog_price_id?: string | null
          created_at?: string
          currency?: string | null
          id?: string
          is_price_overridden?: boolean
          notes?: string | null
          overridden_at?: string | null
          overridden_by?: string | null
          override_reason?: string | null
          product_id?: string | null
          product_variant_id?: string | null
          quantity: number
          quote_id: string
          unit_price?: number | null
          updated_at?: string
        }
        Update: {
          catalog_price_amount?: number | null
          catalog_price_currency?: string | null
          catalog_price_id?: string | null
          created_at?: string
          currency?: string | null
          id?: string
          is_price_overridden?: boolean
          notes?: string | null
          overridden_at?: string | null
          overridden_by?: string | null
          override_reason?: string | null
          product_id?: string | null
          product_variant_id?: string | null
          quantity?: number
          quote_id?: string
          unit_price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_line_items_catalog_price_id_fkey"
            columns: ["catalog_price_id"]
            isOneToOne: false
            referencedRelation: "product_prices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_line_items_overridden_by_fkey"
            columns: ["overridden_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_line_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_line_items_product_variant_id_fkey"
            columns: ["product_variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
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
      quote_negotiation_events: {
        Row: {
          actor_name: string | null
          actor_type: string
          actor_user_id: string | null
          created_at: string
          event_type: string
          id: string
          message: string | null
          payload: Json
          quote_id: string
          quote_version_id: string | null
        }
        Insert: {
          actor_name?: string | null
          actor_type: string
          actor_user_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          message?: string | null
          payload?: Json
          quote_id: string
          quote_version_id?: string | null
        }
        Update: {
          actor_name?: string | null
          actor_type?: string
          actor_user_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          message?: string | null
          payload?: Json
          quote_id?: string
          quote_version_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quote_negotiation_events_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_negotiation_events_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_negotiation_events_quote_version_id_fkey"
            columns: ["quote_version_id"]
            isOneToOne: false
            referencedRelation: "quote_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_pricing_snapshots: {
        Row: {
          calculation_payload: Json
          created_at: string
          freight_context: Json
          freight_profile_id: string | null
          fx_base_currency: string
          fx_display_currency: string
          fx_effective_at: string | null
          fx_provider: string | null
          fx_rate: number | null
          id: string
          pricing_rule_set_id: string | null
          quote_context: Json
          quote_version_id: string
          source_hash: string | null
        }
        Insert: {
          calculation_payload?: Json
          created_at?: string
          freight_context?: Json
          freight_profile_id?: string | null
          fx_base_currency?: string
          fx_display_currency: string
          fx_effective_at?: string | null
          fx_provider?: string | null
          fx_rate?: number | null
          id?: string
          pricing_rule_set_id?: string | null
          quote_context?: Json
          quote_version_id: string
          source_hash?: string | null
        }
        Update: {
          calculation_payload?: Json
          created_at?: string
          freight_context?: Json
          freight_profile_id?: string | null
          fx_base_currency?: string
          fx_display_currency?: string
          fx_effective_at?: string | null
          fx_provider?: string | null
          fx_rate?: number | null
          id?: string
          pricing_rule_set_id?: string | null
          quote_context?: Json
          quote_version_id?: string
          source_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quote_pricing_snapshots_freight_profile_id_fkey"
            columns: ["freight_profile_id"]
            isOneToOne: false
            referencedRelation: "freight_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_pricing_snapshots_pricing_rule_set_id_fkey"
            columns: ["pricing_rule_set_id"]
            isOneToOne: false
            referencedRelation: "pricing_rule_sets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_pricing_snapshots_quote_version_id_fkey"
            columns: ["quote_version_id"]
            isOneToOne: true
            referencedRelation: "quote_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_templates: {
        Row: {
          created_at: string
          created_by: string | null
          footer_config: Json
          header_config: Json
          id: string
          is_active: boolean
          is_default: boolean
          layout_schema: Json
          name: string
          organization_id: string
          template_type: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          footer_config?: Json
          header_config?: Json
          id?: string
          is_active?: boolean
          is_default?: boolean
          layout_schema?: Json
          name: string
          organization_id: string
          template_type: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          footer_config?: Json
          header_config?: Json
          id?: string
          is_active?: boolean
          is_default?: boolean
          layout_schema?: Json
          name?: string
          organization_id?: string
          template_type?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quote_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_templates_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_version_line_items: {
        Row: {
          basis_applied: string
          calculation_meta: Json
          catalog_price_snapshot: Json
          catalog_pricing_rule_id: string | null
          catalog_pricing_rule_set_id: string | null
          category_type: string
          created_at: string
          display_currency: string
          final_case_price: number | null
          final_kg_price: number | null
          final_unit_price: number | null
          freight_add_on_usd: number | null
          fx_rate: number | null
          hsn_code: string | null
          id: string
          is_overridden: boolean
          line_notes: string | null
          moq: number | null
          overridden_at: string | null
          overridden_by: string | null
          override_reason: string | null
          override_requested_by: string | null
          override_status: string | null
          override_type: string | null
          pack_label: string | null
          pricing_mode: string
          product_id: string | null
          product_name: string
          product_variant_id: string | null
          quote_version_id: string
          sku_code: string
          sort_order: number
          source_bulk_inr_per_kg: number | null
          source_bulk_usd_per_kg: number | null
          source_ex_factory_inr: number | null
          source_ex_factory_usd: number | null
          source_fob_inr: number | null
          source_fob_usd: number | null
          units_per_case: number | null
        }
        Insert: {
          basis_applied: string
          calculation_meta?: Json
          catalog_price_snapshot?: Json
          catalog_pricing_rule_id?: string | null
          catalog_pricing_rule_set_id?: string | null
          category_type: string
          created_at?: string
          display_currency: string
          final_case_price?: number | null
          final_kg_price?: number | null
          final_unit_price?: number | null
          freight_add_on_usd?: number | null
          fx_rate?: number | null
          hsn_code?: string | null
          id?: string
          is_overridden?: boolean
          line_notes?: string | null
          moq?: number | null
          overridden_at?: string | null
          overridden_by?: string | null
          override_reason?: string | null
          override_requested_by?: string | null
          override_status?: string | null
          override_type?: string | null
          pack_label?: string | null
          pricing_mode: string
          product_id?: string | null
          product_name: string
          product_variant_id?: string | null
          quote_version_id: string
          sku_code: string
          sort_order?: number
          source_bulk_inr_per_kg?: number | null
          source_bulk_usd_per_kg?: number | null
          source_ex_factory_inr?: number | null
          source_ex_factory_usd?: number | null
          source_fob_inr?: number | null
          source_fob_usd?: number | null
          units_per_case?: number | null
        }
        Update: {
          basis_applied?: string
          calculation_meta?: Json
          catalog_price_snapshot?: Json
          catalog_pricing_rule_id?: string | null
          catalog_pricing_rule_set_id?: string | null
          category_type?: string
          created_at?: string
          display_currency?: string
          final_case_price?: number | null
          final_kg_price?: number | null
          final_unit_price?: number | null
          freight_add_on_usd?: number | null
          fx_rate?: number | null
          hsn_code?: string | null
          id?: string
          is_overridden?: boolean
          line_notes?: string | null
          moq?: number | null
          overridden_at?: string | null
          overridden_by?: string | null
          override_reason?: string | null
          override_requested_by?: string | null
          override_status?: string | null
          override_type?: string | null
          pack_label?: string | null
          pricing_mode?: string
          product_id?: string | null
          product_name?: string
          product_variant_id?: string | null
          quote_version_id?: string
          sku_code?: string
          sort_order?: number
          source_bulk_inr_per_kg?: number | null
          source_bulk_usd_per_kg?: number | null
          source_ex_factory_inr?: number | null
          source_ex_factory_usd?: number | null
          source_fob_inr?: number | null
          source_fob_usd?: number | null
          units_per_case?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quote_version_line_items_overridden_by_fkey"
            columns: ["overridden_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_version_line_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_version_line_items_product_variant_id_fkey"
            columns: ["product_variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_version_line_items_quote_version_id_fkey"
            columns: ["quote_version_id"]
            isOneToOne: false
            referencedRelation: "quote_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_vli_catalog_pricing_rule_id_fkey"
            columns: ["catalog_pricing_rule_id"]
            isOneToOne: false
            referencedRelation: "active_product_pricing_rules_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_vli_catalog_pricing_rule_id_fkey"
            columns: ["catalog_pricing_rule_id"]
            isOneToOne: false
            referencedRelation: "product_pricing_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_vli_catalog_pricing_rule_set_id_fkey"
            columns: ["catalog_pricing_rule_set_id"]
            isOneToOne: false
            referencedRelation: "pricing_rule_sets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_vli_override_requested_by_fkey"
            columns: ["override_requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_versions: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by: string | null
          customer_message: string | null
          display_currency: string
          id: string
          import_run_id: string | null
          internal_notes: string | null
          parent_version_id: string | null
          pdf_document_id: string | null
          pricing_basis: string
          quote_id: string
          sent_at: string | null
          sent_by: string | null
          source_file_name: string | null
          source_hash: string | null
          status: string
          total_line_count: number
          updated_at: string
          valid_until: string | null
          version_no: number
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          customer_message?: string | null
          display_currency: string
          id?: string
          import_run_id?: string | null
          internal_notes?: string | null
          parent_version_id?: string | null
          pdf_document_id?: string | null
          pricing_basis: string
          quote_id: string
          sent_at?: string | null
          sent_by?: string | null
          source_file_name?: string | null
          source_hash?: string | null
          status?: string
          total_line_count?: number
          updated_at?: string
          valid_until?: string | null
          version_no: number
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          customer_message?: string | null
          display_currency?: string
          id?: string
          import_run_id?: string | null
          internal_notes?: string | null
          parent_version_id?: string | null
          pdf_document_id?: string | null
          pricing_basis?: string
          quote_id?: string
          sent_at?: string | null
          sent_by?: string | null
          source_file_name?: string | null
          source_hash?: string | null
          status?: string
          total_line_count?: number
          updated_at?: string
          valid_until?: string | null
          version_no?: number
        }
        Relationships: [
          {
            foreignKeyName: "quote_versions_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_versions_import_run_id_fkey"
            columns: ["import_run_id"]
            isOneToOne: false
            referencedRelation: "import_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_versions_parent_version_id_fkey"
            columns: ["parent_version_id"]
            isOneToOne: false
            referencedRelation: "quote_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_versions_pdf_document_id_fkey"
            columns: ["pdf_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_versions_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_versions_sent_by_fkey"
            columns: ["sent_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          accepted_version_id: string | null
          approval_required: boolean
          approved_at: string | null
          approved_by: string | null
          country_id: string | null
          created_at: string
          created_by: string | null
          currency: string | null
          current_version_id: string | null
          destination_port: string | null
          display_currency: string | null
          freight_profile_id: string | null
          id: string
          import_run_id: string | null
          lead_id: string
          market_id: string | null
          notes: string | null
          notes_customer: string | null
          notes_internal: string | null
          organization_id: string
          pricing_basis: string | null
          quote_number: string | null
          rfq_id: string | null
          source_file_name: string | null
          source_hash: string | null
          source_type: string
          status: string
          updated_at: string
          valid_until: string | null
          version_no: number
        }
        Insert: {
          accepted_version_id?: string | null
          approval_required?: boolean
          approved_at?: string | null
          approved_by?: string | null
          country_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          current_version_id?: string | null
          destination_port?: string | null
          display_currency?: string | null
          freight_profile_id?: string | null
          id?: string
          import_run_id?: string | null
          lead_id: string
          market_id?: string | null
          notes?: string | null
          notes_customer?: string | null
          notes_internal?: string | null
          organization_id: string
          pricing_basis?: string | null
          quote_number?: string | null
          rfq_id?: string | null
          source_file_name?: string | null
          source_hash?: string | null
          source_type?: string
          status?: string
          updated_at?: string
          valid_until?: string | null
          version_no?: number
        }
        Update: {
          accepted_version_id?: string | null
          approval_required?: boolean
          approved_at?: string | null
          approved_by?: string | null
          country_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          current_version_id?: string | null
          destination_port?: string | null
          display_currency?: string | null
          freight_profile_id?: string | null
          id?: string
          import_run_id?: string | null
          lead_id?: string
          market_id?: string | null
          notes?: string | null
          notes_customer?: string | null
          notes_internal?: string | null
          organization_id?: string
          pricing_basis?: string | null
          quote_number?: string | null
          rfq_id?: string | null
          source_file_name?: string | null
          source_hash?: string | null
          source_type?: string
          status?: string
          updated_at?: string
          valid_until?: string | null
          version_no?: number
        }
        Relationships: [
          {
            foreignKeyName: "quotes_accepted_version_id_fkey"
            columns: ["accepted_version_id"]
            isOneToOne: false
            referencedRelation: "quote_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_current_version_id_fkey"
            columns: ["current_version_id"]
            isOneToOne: false
            referencedRelation: "quote_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_freight_profile_id_fkey"
            columns: ["freight_profile_id"]
            isOneToOne: false
            referencedRelation: "freight_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_import_run_id_fkey"
            columns: ["import_run_id"]
            isOneToOne: false
            referencedRelation: "import_runs"
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
            foreignKeyName: "quotes_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
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
      rate_limit_hits: {
        Row: {
          count: number
          key: string
          window_start: string
        }
        Insert: {
          count?: number
          key: string
          window_start?: string
        }
        Update: {
          count?: number
          key?: string
          window_start?: string
        }
        Relationships: []
      }
      rfq_line_items: {
        Row: {
          catalog_price_amount: number | null
          catalog_price_currency: string | null
          catalog_price_id: string | null
          created_at: string | null
          currency: string | null
          id: string
          is_price_overridden: boolean
          notes: string | null
          overridden_at: string | null
          overridden_by: string | null
          override_reason: string | null
          product_id: string | null
          product_variant_id: string | null
          quantity: number
          rfq_id: string | null
          unit_price: number | null
          updated_at: string | null
        }
        Insert: {
          catalog_price_amount?: number | null
          catalog_price_currency?: string | null
          catalog_price_id?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          is_price_overridden?: boolean
          notes?: string | null
          overridden_at?: string | null
          overridden_by?: string | null
          override_reason?: string | null
          product_id?: string | null
          product_variant_id?: string | null
          quantity: number
          rfq_id?: string | null
          unit_price?: number | null
          updated_at?: string | null
        }
        Update: {
          catalog_price_amount?: number | null
          catalog_price_currency?: string | null
          catalog_price_id?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          is_price_overridden?: boolean
          notes?: string | null
          overridden_at?: string | null
          overridden_by?: string | null
          override_reason?: string | null
          product_id?: string | null
          product_variant_id?: string | null
          quantity?: number
          rfq_id?: string | null
          unit_price?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rfq_line_items_catalog_price_id_fkey"
            columns: ["catalog_price_id"]
            isOneToOne: false
            referencedRelation: "product_prices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfq_line_items_overridden_by_fkey"
            columns: ["overridden_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfq_line_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfq_line_items_product_variant_id_fkey"
            columns: ["product_variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
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
      saved_views: {
        Row: {
          column_model: Json | null
          created_at: string
          created_by_membership_id: string
          description: string | null
          entity_type: string
          filter_model: Json
          id: string
          name: string
          organization_id: string
          sort_model: Json | null
          updated_at: string
          updated_by_membership_id: string | null
          visibility: string
        }
        Insert: {
          column_model?: Json | null
          created_at?: string
          created_by_membership_id: string
          description?: string | null
          entity_type: string
          filter_model?: Json
          id?: string
          name: string
          organization_id: string
          sort_model?: Json | null
          updated_at?: string
          updated_by_membership_id?: string | null
          visibility?: string
        }
        Update: {
          column_model?: Json | null
          created_at?: string
          created_by_membership_id?: string
          description?: string | null
          entity_type?: string
          filter_model?: Json
          id?: string
          name?: string
          organization_id?: string
          sort_model?: Json | null
          updated_at?: string
          updated_by_membership_id?: string | null
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_views_created_by_membership_id_fkey"
            columns: ["created_by_membership_id"]
            isOneToOne: false
            referencedRelation: "organization_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_views_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_views_updated_by_membership_id_fkey"
            columns: ["updated_by_membership_id"]
            isOneToOne: false
            referencedRelation: "organization_members"
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
      stg_lead_raw: {
        Row: {
          created_at: string
          id: string
          parse_error: string | null
          parse_status: string
          raw_payload: Json
          row_hash: string | null
          run_id: string
          source_file_name: string | null
          source_row_no: number | null
          source_sheet_name: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          parse_error?: string | null
          parse_status?: string
          raw_payload?: Json
          row_hash?: string | null
          run_id: string
          source_file_name?: string | null
          source_row_no?: number | null
          source_sheet_name?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          parse_error?: string | null
          parse_status?: string
          raw_payload?: Json
          row_hash?: string | null
          run_id?: string
          source_file_name?: string | null
          source_row_no?: number | null
          source_sheet_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stg_lead_raw_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "import_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      stg_lead_resolved: {
        Row: {
          created_at: string
          id: string
          ready_to_insert: boolean
          resolved_payload: Json
          row_hash: string | null
          run_id: string
          source_file_name: string | null
          source_row_no: number | null
          source_sheet_name: string | null
          validation_status: string
        }
        Insert: {
          created_at?: string
          id?: string
          ready_to_insert?: boolean
          resolved_payload?: Json
          row_hash?: string | null
          run_id: string
          source_file_name?: string | null
          source_row_no?: number | null
          source_sheet_name?: string | null
          validation_status?: string
        }
        Update: {
          created_at?: string
          id?: string
          ready_to_insert?: boolean
          resolved_payload?: Json
          row_hash?: string | null
          run_id?: string
          source_file_name?: string | null
          source_row_no?: number | null
          source_sheet_name?: string | null
          validation_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "stg_lead_resolved_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "import_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      stg_pricing_raw: {
        Row: {
          created_at: string
          id: string
          parse_error: string | null
          parse_status: string
          raw_payload: Json
          row_hash: string | null
          run_id: string
          source_file_name: string | null
          source_row_no: number | null
          source_sheet_name: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          parse_error?: string | null
          parse_status?: string
          raw_payload?: Json
          row_hash?: string | null
          run_id: string
          source_file_name?: string | null
          source_row_no?: number | null
          source_sheet_name?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          parse_error?: string | null
          parse_status?: string
          raw_payload?: Json
          row_hash?: string | null
          run_id?: string
          source_file_name?: string | null
          source_row_no?: number | null
          source_sheet_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stg_pricing_raw_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "import_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      stg_pricing_resolved: {
        Row: {
          created_at: string
          id: string
          ready_to_insert: boolean
          resolved_payload: Json
          row_hash: string | null
          run_id: string
          source_file_name: string | null
          source_row_no: number | null
          source_sheet_name: string | null
          validation_status: string
        }
        Insert: {
          created_at?: string
          id?: string
          ready_to_insert?: boolean
          resolved_payload?: Json
          row_hash?: string | null
          run_id: string
          source_file_name?: string | null
          source_row_no?: number | null
          source_sheet_name?: string | null
          validation_status?: string
        }
        Update: {
          created_at?: string
          id?: string
          ready_to_insert?: boolean
          resolved_payload?: Json
          row_hash?: string | null
          run_id?: string
          source_file_name?: string | null
          source_row_no?: number | null
          source_sheet_name?: string | null
          validation_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "stg_pricing_resolved_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "import_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      stg_product_raw: {
        Row: {
          created_at: string
          id: string
          parse_error: string | null
          parse_status: string
          raw_payload: Json
          row_hash: string | null
          run_id: string
          source_file_name: string | null
          source_row_no: number | null
          source_sheet_name: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          parse_error?: string | null
          parse_status?: string
          raw_payload?: Json
          row_hash?: string | null
          run_id: string
          source_file_name?: string | null
          source_row_no?: number | null
          source_sheet_name?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          parse_error?: string | null
          parse_status?: string
          raw_payload?: Json
          row_hash?: string | null
          run_id?: string
          source_file_name?: string | null
          source_row_no?: number | null
          source_sheet_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stg_product_raw_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "import_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      stg_product_resolved: {
        Row: {
          created_at: string
          id: string
          ready_to_insert: boolean
          resolved_payload: Json
          row_hash: string | null
          run_id: string
          source_file_name: string | null
          source_row_no: number | null
          source_sheet_name: string | null
          validation_status: string
        }
        Insert: {
          created_at?: string
          id?: string
          ready_to_insert?: boolean
          resolved_payload?: Json
          row_hash?: string | null
          run_id: string
          source_file_name?: string | null
          source_row_no?: number | null
          source_sheet_name?: string | null
          validation_status?: string
        }
        Update: {
          created_at?: string
          id?: string
          ready_to_insert?: boolean
          resolved_payload?: Json
          row_hash?: string | null
          run_id?: string
          source_file_name?: string | null
          source_row_no?: number | null
          source_sheet_name?: string | null
          validation_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "stg_product_resolved_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "import_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      stg_quote_line_raw: {
        Row: {
          created_at: string
          id: string
          parse_error: string | null
          parse_status: string
          raw_payload: Json
          row_hash: string | null
          run_id: string
          source_file_name: string | null
          source_line_no: number | null
          source_page_ref: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          parse_error?: string | null
          parse_status?: string
          raw_payload?: Json
          row_hash?: string | null
          run_id: string
          source_file_name?: string | null
          source_line_no?: number | null
          source_page_ref?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          parse_error?: string | null
          parse_status?: string
          raw_payload?: Json
          row_hash?: string | null
          run_id?: string
          source_file_name?: string | null
          source_line_no?: number | null
          source_page_ref?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stg_quote_line_raw_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "import_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      stg_quote_line_resolved: {
        Row: {
          created_at: string
          id: string
          quote_number_final: string | null
          ready_to_insert: boolean
          resolved_payload: Json
          row_hash: string | null
          run_id: string
          source_file_name: string | null
          source_line_no: number | null
          source_page_ref: string | null
          validation_status: string
        }
        Insert: {
          created_at?: string
          id?: string
          quote_number_final?: string | null
          ready_to_insert?: boolean
          resolved_payload?: Json
          row_hash?: string | null
          run_id: string
          source_file_name?: string | null
          source_line_no?: number | null
          source_page_ref?: string | null
          validation_status?: string
        }
        Update: {
          created_at?: string
          id?: string
          quote_number_final?: string | null
          ready_to_insert?: boolean
          resolved_payload?: Json
          row_hash?: string | null
          run_id?: string
          source_file_name?: string | null
          source_line_no?: number | null
          source_page_ref?: string | null
          validation_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "stg_quote_line_resolved_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "import_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      stg_quote_raw: {
        Row: {
          created_at: string
          id: string
          parse_error: string | null
          parse_status: string
          raw_payload: Json
          row_hash: string | null
          run_id: string
          source_file_name: string | null
          source_page_ref: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          parse_error?: string | null
          parse_status?: string
          raw_payload?: Json
          row_hash?: string | null
          run_id: string
          source_file_name?: string | null
          source_page_ref?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          parse_error?: string | null
          parse_status?: string
          raw_payload?: Json
          row_hash?: string | null
          run_id?: string
          source_file_name?: string | null
          source_page_ref?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stg_quote_raw_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "import_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      stg_quote_resolved: {
        Row: {
          created_at: string
          id: string
          quote_number_final: string | null
          ready_to_insert: boolean
          resolved_payload: Json
          run_id: string
          source_file_name: string | null
          validation_status: string
        }
        Insert: {
          created_at?: string
          id?: string
          quote_number_final?: string | null
          ready_to_insert?: boolean
          resolved_payload?: Json
          run_id: string
          source_file_name?: string | null
          validation_status?: string
        }
        Update: {
          created_at?: string
          id?: string
          quote_number_final?: string | null
          ready_to_insert?: boolean
          resolved_payload?: Json
          run_id?: string
          source_file_name?: string | null
          validation_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "stg_quote_resolved_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "import_runs"
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
      trade_event_entries: {
        Row: {
          assigned_user_id: string | null
          captured_at: string
          captured_company_name: string | null
          captured_contact_name: string | null
          captured_country: string | null
          captured_email: string | null
          captured_job_title: string | null
          captured_notes: string | null
          captured_phone: string | null
          converted_at: string | null
          converted_lead_id: string | null
          created_at: string
          created_by: string | null
          duplicate_of_entry_id: string | null
          id: string
          normalized_payload: Json
          organization_id: string
          qualified_at: string | null
          raw_payload: Json
          source_label: string | null
          source_scan_ref: string | null
          status: string
          trade_event_id: string
          updated_at: string
        }
        Insert: {
          assigned_user_id?: string | null
          captured_at?: string
          captured_company_name?: string | null
          captured_contact_name?: string | null
          captured_country?: string | null
          captured_email?: string | null
          captured_job_title?: string | null
          captured_notes?: string | null
          captured_phone?: string | null
          converted_at?: string | null
          converted_lead_id?: string | null
          created_at?: string
          created_by?: string | null
          duplicate_of_entry_id?: string | null
          id?: string
          normalized_payload?: Json
          organization_id: string
          qualified_at?: string | null
          raw_payload?: Json
          source_label?: string | null
          source_scan_ref?: string | null
          status?: string
          trade_event_id: string
          updated_at?: string
        }
        Update: {
          assigned_user_id?: string | null
          captured_at?: string
          captured_company_name?: string | null
          captured_contact_name?: string | null
          captured_country?: string | null
          captured_email?: string | null
          captured_job_title?: string | null
          captured_notes?: string | null
          captured_phone?: string | null
          converted_at?: string | null
          converted_lead_id?: string | null
          created_at?: string
          created_by?: string | null
          duplicate_of_entry_id?: string | null
          id?: string
          normalized_payload?: Json
          organization_id?: string
          qualified_at?: string | null
          raw_payload?: Json
          source_label?: string | null
          source_scan_ref?: string | null
          status?: string
          trade_event_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trade_event_entries_assigned_user_id_fkey"
            columns: ["assigned_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_event_entries_converted_lead_id_fkey"
            columns: ["converted_lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_event_entries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_event_entries_duplicate_of_entry_id_fkey"
            columns: ["duplicate_of_entry_id"]
            isOneToOne: false
            referencedRelation: "trade_event_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_event_entries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_event_entries_trade_event_id_fkey"
            columns: ["trade_event_id"]
            isOneToOne: false
            referencedRelation: "trade_events"
            referencedColumns: ["id"]
          },
        ]
      }
      trade_events: {
        Row: {
          capture_defaults: Json
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
          capture_defaults?: Json
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
          capture_defaults?: Json
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
      view_preferences: {
        Row: {
          built_in_view_key: string | null
          created_at: string
          entity_type: string
          id: string
          organization_id: string
          organization_member_id: string
          saved_view_id: string | null
          updated_at: string
        }
        Insert: {
          built_in_view_key?: string | null
          created_at?: string
          entity_type: string
          id?: string
          organization_id: string
          organization_member_id: string
          saved_view_id?: string | null
          updated_at?: string
        }
        Update: {
          built_in_view_key?: string | null
          created_at?: string
          entity_type?: string
          id?: string
          organization_id?: string
          organization_member_id?: string
          saved_view_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "view_preferences_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "view_preferences_organization_member_id_fkey"
            columns: ["organization_member_id"]
            isOneToOne: false
            referencedRelation: "organization_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "view_preferences_saved_view_id_fkey"
            columns: ["saved_view_id"]
            isOneToOne: false
            referencedRelation: "saved_views"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      active_product_pricing_rules_v: {
        Row: {
          brand_name: string | null
          bulk_ex_factory_inr_per_kg: number | null
          bulk_ex_factory_usd_per_kg: number | null
          bulk_input_amount_per_kg: number | null
          bulk_input_currency: string | null
          bulk_usd_per_kg: number | null
          category_name: string | null
          category_type: string | null
          created_at: string | null
          created_by: string | null
          effective_from: string | null
          effective_to: string | null
          ex_factory_input_amount: number | null
          ex_factory_input_currency: string | null
          ex_factory_inr: number | null
          ex_factory_usd: number | null
          ex_factory_usd_per_case: number | null
          ex_factory_usd_per_unit: number | null
          fob_input_amount: number | null
          fob_input_currency: string | null
          fob_inr: number | null
          fob_usd: number | null
          fob_usd_per_case: number | null
          fob_usd_per_unit: number | null
          fx_provider: string | null
          fx_rate_to_usd: number | null
          fx_reference_week_end: string | null
          fx_reference_week_start: string | null
          fx_source_currency: string | null
          hsn_code: string | null
          id: string | null
          is_active: boolean | null
          is_quoteable: boolean | null
          moq: number | null
          organization_id: string | null
          pack_label: string | null
          pricing_rule_set_id: string | null
          pricing_type: string | null
          product_id: string | null
          product_name: string | null
          product_variant_id: string | null
          raw_source_payload: Json | null
          raw_source_row_no: number | null
          sku_code: string | null
          sort_order: number | null
          source_hash: string | null
          source_sheet_name: string | null
          units_per_case: number | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          brand_name?: string | null
          bulk_ex_factory_inr_per_kg?: number | null
          bulk_ex_factory_usd_per_kg?: number | null
          bulk_input_amount_per_kg?: number | null
          bulk_input_currency?: string | null
          bulk_usd_per_kg?: number | null
          category_name?: string | null
          category_type?: string | null
          created_at?: string | null
          created_by?: string | null
          effective_from?: string | null
          effective_to?: string | null
          ex_factory_input_amount?: number | null
          ex_factory_input_currency?: string | null
          ex_factory_inr?: number | null
          ex_factory_usd?: number | null
          ex_factory_usd_per_case?: number | null
          ex_factory_usd_per_unit?: number | null
          fob_input_amount?: number | null
          fob_input_currency?: string | null
          fob_inr?: number | null
          fob_usd?: number | null
          fob_usd_per_case?: number | null
          fob_usd_per_unit?: number | null
          fx_provider?: string | null
          fx_rate_to_usd?: number | null
          fx_reference_week_end?: string | null
          fx_reference_week_start?: string | null
          fx_source_currency?: string | null
          hsn_code?: string | null
          id?: string | null
          is_active?: boolean | null
          is_quoteable?: boolean | null
          moq?: number | null
          organization_id?: string | null
          pack_label?: string | null
          pricing_rule_set_id?: string | null
          pricing_type?: string | null
          product_id?: string | null
          product_name?: string | null
          product_variant_id?: string | null
          raw_source_payload?: Json | null
          raw_source_row_no?: number | null
          sku_code?: string | null
          sort_order?: number | null
          source_hash?: string | null
          source_sheet_name?: string | null
          units_per_case?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          brand_name?: string | null
          bulk_ex_factory_inr_per_kg?: number | null
          bulk_ex_factory_usd_per_kg?: number | null
          bulk_input_amount_per_kg?: number | null
          bulk_input_currency?: string | null
          bulk_usd_per_kg?: number | null
          category_name?: string | null
          category_type?: string | null
          created_at?: string | null
          created_by?: string | null
          effective_from?: string | null
          effective_to?: string | null
          ex_factory_input_amount?: number | null
          ex_factory_input_currency?: string | null
          ex_factory_inr?: number | null
          ex_factory_usd?: number | null
          ex_factory_usd_per_case?: number | null
          ex_factory_usd_per_unit?: number | null
          fob_input_amount?: number | null
          fob_input_currency?: string | null
          fob_inr?: number | null
          fob_usd?: number | null
          fob_usd_per_case?: number | null
          fob_usd_per_unit?: number | null
          fx_provider?: string | null
          fx_rate_to_usd?: number | null
          fx_reference_week_end?: string | null
          fx_reference_week_start?: string | null
          fx_source_currency?: string | null
          hsn_code?: string | null
          id?: string | null
          is_active?: boolean | null
          is_quoteable?: boolean | null
          moq?: number | null
          organization_id?: string | null
          pack_label?: string | null
          pricing_rule_set_id?: string | null
          pricing_type?: string | null
          product_id?: string | null
          product_name?: string | null
          product_variant_id?: string | null
          raw_source_payload?: Json | null
          raw_source_row_no?: number | null
          sku_code?: string | null
          sort_order?: number | null
          source_hash?: string | null
          source_sheet_name?: string | null
          units_per_case?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_pricing_rules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_pricing_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_pricing_rules_pricing_rule_set_id_fkey"
            columns: ["pricing_rule_set_id"]
            isOneToOne: false
            referencedRelation: "pricing_rule_sets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_pricing_rules_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_pricing_rules_product_variant_id_fkey"
            columns: ["product_variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_pricing_rules_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      app_batch_move_leads_stage_tx: {
        Args: {
          p_actor_user_id: string
          p_lead_ids: string[]
          p_occurred_at?: string
          p_organization_id: string
          p_stage_id: string
        }
        Returns: {
          lead_id: string
          stage_id: string
          updated_at: string
        }[]
      }
      app_contract_progression_blocker_count: {
        Args: { p_lead_id: string; p_organization_id: string }
        Returns: number
      }
      app_create_draft_quote_version_from_compile_tx: {
        Args: { p_payload: Json }
        Returns: {
          id: string
          quote_id: string
          status: string
          version_no: number
        }[]
      }
      app_create_quote_with_line_items_and_fanout_tx: {
        Args: {
          p_action_source?: string
          p_actor_name: string
          p_approval_required?: boolean
          p_approval_state?: string
          p_created_by: string
          p_currency: string
          p_lead_id: string
          p_line_items: Json
          p_notes: string
          p_organization_id: string
          p_plain_notes?: string
          p_rfq_id: string
          p_status: string
        }
        Returns: {
          contract_id: string
          lead_id: string
          quote_id: string
        }[]
      }
      app_create_quote_with_line_items_tx: {
        Args: {
          p_created_by: string
          p_currency: string
          p_lead_id: string
          p_line_items: Json
          p_notes: string
          p_organization_id: string
          p_rfq_id: string
          p_status: string
        }
        Returns: {
          lead_id: string
          quote_id: string
        }[]
      }
      app_create_rfq_with_line_items_and_fanout_tx: {
        Args: {
          p_action_source?: string
          p_created_by: string
          p_currency: string
          p_lead_id: string
          p_line_items: Json
          p_notes: string
          p_organization_id: string
          p_request_summary: string
          p_status: string
          p_supplier_response_count?: number
          p_validity_date: string
        }
        Returns: {
          lead_id: string
          rfq_id: string
        }[]
      }
      app_deactivate_product_tx: {
        Args: { p_payload: Json }
        Returns: {
          deactivated_price_count: number
          deactivated_pricing_rule_count: number
          deactivated_variant_count: number
          product_id: string
        }[]
      }
      app_delete_catalog_price_tx: {
        Args: { p_payload: Json }
        Returns: {
          price_row_id: string
        }[]
      }
      app_delete_settings_list_item_tx: {
        Args: { p_payload: Json }
        Returns: {
          deleted_id: string
        }[]
      }
      app_ensure_contract_for_accepted_quote_tx: {
        Args: {
          p_lead_id: string
          p_notes?: string
          p_organization_id: string
          p_quote_id: string
        }
        Returns: {
          contract_id: string
          lead_id: string
          quote_id: string
        }[]
      }
      app_extract_setuflow_meta: { Args: { p_notes: string }; Returns: Json }
      app_finalize_invitation_acceptance_tx: {
        Args: { p_payload: Json }
        Returns: {
          invitation_id: string
          membership_id: string
        }[]
      }
      app_finalize_invitation_delivery_tx: {
        Args: { p_payload: Json }
        Returns: {
          invitation_id: string
          status: string
        }[]
      }
      app_import_settings_snapshot_tx: {
        Args: { p_payload: Json }
        Returns: {
          countries_imported: number
          markets_imported: number
          next_steps_imported: number
          product_categories_imported: number
        }[]
      }
      app_move_lead_stage_tx: {
        Args: {
          p_actor_user_id: string
          p_lead_id: string
          p_occurred_at?: string
          p_organization_id: string
          p_stage_id: string
        }
        Returns: {
          company_name: string
          id: string
          previous_stage_id: string
          stage_id: string
          stage_name: string
          updated_at: string
        }[]
      }
      app_pricing_engine_tx_ready: { Args: never; Returns: boolean }
      app_progress_contract_with_fanout_tx: {
        Args: {
          p_action_source?: string
          p_actor_user_id: string
          p_contract_id: string
          p_next_status: string
          p_notes?: string
          p_organization_id: string
        }
        Returns: {
          contract_id: string
          current_status: string
          lead_id: string
          next_status: string
          quote_id: string
          subject: string
        }[]
      }
      app_quote_contract_snapshot: {
        Args: { p_quote_id: string }
        Returns: Json
      }
      app_record_save_lead_non_stage_fanout_tx: {
        Args: {
          p_actor_user_id: string
          p_lead_id: string
          p_organization_id: string
          p_payload: Json
        }
        Returns: {
          activity_count: number
          communication_count: number
          lead_id: string
        }[]
      }
      app_record_save_lead_stage_change_fanout_tx: {
        Args: {
          p_actor_user_id: string
          p_company_name: string
          p_from_stage_id: string
          p_lead_id: string
          p_organization_id: string
          p_to_stage_id: string
        }
        Returns: {
          activity_kind: string
          communication_subject: string
          lead_id: string
        }[]
      }
      app_refresh_lead_relations_tx: {
        Args: {
          p_lead_id: string
          p_market_ids?: string[]
          p_organization_id: string
          p_product_ids?: string[]
        }
        Returns: undefined
      }
      app_replace_lead_follow_up_tx: {
        Args: {
          p_actor_user_id?: string
          p_lead_id: string
          p_organization_id: string
          p_scheduled_at: string
        }
        Returns: {
          id: string
          lead_id: string
          scheduled_at: string
          status: string
        }[]
      }
      app_save_catalog_price_tx: {
        Args: { p_payload: Json }
        Returns: {
          mutation_action: string
          price_row_id: string
          product_variant_id: string
        }[]
      }
      app_save_product_with_catalog_pricing_tx: {
        Args: { p_payload: Json }
        Returns: {
          price_row_id: string
          primary_variant_id: string
          product_id: string
        }[]
      }
      app_save_settings_list_item_tx: {
        Args: { p_payload: Json }
        Returns: {
          saved_id: string
        }[]
      }
      app_send_quote_version_tx: {
        Args: { p_actor_user_id: string; p_quote_version_id: string }
        Returns: undefined
      }
      app_send_quote_version_with_fanout_tx: {
        Args: {
          p_action_source?: string
          p_actor_name: string
          p_actor_user_id: string
          p_approval_required?: boolean
          p_approval_state?: string
          p_plain_notes?: string
          p_quote_version_id: string
        }
        Returns: {
          lead_id: string
          quote_id: string
          quote_version_id: string
        }[]
      }
      app_set_membership_active_tx: {
        Args: { p_payload: Json }
        Returns: {
          is_active: boolean
          membership_id: string
        }[]
      }
      app_sync_contract_from_quote_tx: {
        Args: {
          p_contract_id: string
          p_lead_id: string
          p_organization_id: string
          p_quote_id: string
        }
        Returns: undefined
      }
      app_update_compliance_workflow_tx: {
        Args: {
          p_action_source?: string
          p_actor_user_id: string
          p_compliance_id: string
          p_organization_id: string
          p_review_notes?: string
          p_status: string
        }
        Returns: {
          compliance_id: string
          lead_id: string
        }[]
      }
      app_update_contract_workspace_details_tx: {
        Args: { p_payload: Json }
        Returns: {
          contract_id: string
          lead_id: string
          quote_id: string
          subject: string
        }[]
      }
      app_update_document_workflow_tx: {
        Args: {
          p_action_source?: string
          p_actor_user_id: string
          p_document_id: string
          p_organization_id: string
          p_review_notes?: string
          p_status: string
        }
        Returns: {
          document_id: string
          related_entity: string
          related_id: string
        }[]
      }
      app_update_invitation_role_tx: {
        Args: { p_payload: Json }
        Returns: {
          invitation_id: string
        }[]
      }
      app_update_member_role_tx: {
        Args: { p_payload: Json }
        Returns: {
          membership_id: string
        }[]
      }
      app_update_quote_with_line_items_and_fanout_tx: {
        Args: {
          p_action_source?: string
          p_actor_name: string
          p_actor_user_id: string
          p_approval_required?: boolean
          p_approval_state?: string
          p_currency: string
          p_line_items: Json
          p_notes: string
          p_organization_id: string
          p_plain_notes?: string
          p_pricing_basis: string
          p_quote_id: string
          p_quote_version_id: string
          p_status: string
        }
        Returns: {
          contract_id: string
          lead_id: string
          previous_status: string
          quote_id: string
          quote_version_id: string
        }[]
      }
      app_update_quote_with_line_items_tx: {
        Args: {
          p_currency: string
          p_line_items: Json
          p_notes: string
          p_organization_id: string
          p_pricing_basis: string
          p_quote_id: string
          p_quote_version_id: string
          p_status: string
        }
        Returns: {
          lead_id: string
          previous_status: string
          quote_id: string
          quote_version_id: string
        }[]
      }
      app_update_rfq_with_line_items_and_fanout_tx: {
        Args: {
          p_action_source?: string
          p_actor_user_id: string
          p_currency: string
          p_line_items: Json
          p_notes: string
          p_organization_id: string
          p_request_summary: string
          p_rfq_id: string
          p_status: string
          p_supplier_response_count?: number
          p_validity_date: string
        }
        Returns: {
          lead_id: string
          previous_status: string
          rfq_id: string
        }[]
      }
      app_update_rfq_with_line_items_tx: {
        Args: {
          p_currency: string
          p_line_items: Json
          p_notes: string
          p_organization_id: string
          p_rfq_id: string
          p_status: string
          p_validity_date: string
        }
        Returns: {
          lead_id: string
          previous_status: string
          rfq_id: string
        }[]
      }
      app_upsert_invitation_tx: {
        Args: { p_payload: Json }
        Returns: {
          invitation_id: string
          operation: string
        }[]
      }
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
      generate_quote_number: {
        Args: { p_organization_id: string }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
