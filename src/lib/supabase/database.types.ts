export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
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
      audit_events: {
        Row: {
          created_at: string;
          details: Json;
          event_type: string;
          id: number;
          resource_id: string | null;
          resource_type: string;
          result: string;
          safe_reason_code: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          details?: Json;
          event_type: string;
          id?: never;
          resource_id?: string | null;
          resource_type: string;
          result?: string;
          safe_reason_code?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          details?: Json;
          event_type?: string;
          id?: never;
          resource_id?: string | null;
          resource_type?: string;
          result?: string;
          safe_reason_code?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      budgets: {
        Row: {
          created_at: string;
          currency: string;
          effective_from: string;
          id: string;
          monthly_limit_minor: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          currency?: string;
          effective_from?: string;
          id?: string;
          monthly_limit_minor: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          currency?: string;
          effective_from?: string;
          id?: string;
          monthly_limit_minor?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      cancellation_guides: {
        Row: {
          cancellation_url: string | null;
          created_at: string;
          id: string;
          instructions: string | null;
          phone_number: string | null;
          subscription_id: string;
          updated_at: string;
          user_id: string;
          user_notes: string | null;
          verified_at: string | null;
        };
        Insert: {
          cancellation_url?: string | null;
          created_at?: string;
          id?: string;
          instructions?: string | null;
          phone_number?: string | null;
          subscription_id: string;
          updated_at?: string;
          user_id: string;
          user_notes?: string | null;
          verified_at?: string | null;
        };
        Update: {
          cancellation_url?: string | null;
          created_at?: string;
          id?: string;
          instructions?: string | null;
          phone_number?: string | null;
          subscription_id?: string;
          updated_at?: string;
          user_id?: string;
          user_notes?: string | null;
          verified_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "cancellation_guides_subscription_fk";
            columns: ["subscription_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "subscriptions";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
      import_column_mappings: {
        Row: {
          amount_column: string | null;
          created_at: string;
          credit_column: string | null;
          date_column: string;
          date_format: string;
          debit_column: string | null;
          description_column: string;
          id: string;
          statement_import_id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          amount_column?: string | null;
          created_at?: string;
          credit_column?: string | null;
          date_column: string;
          date_format?: string;
          debit_column?: string | null;
          description_column: string;
          id?: string;
          statement_import_id: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          amount_column?: string | null;
          created_at?: string;
          credit_column?: string | null;
          date_column?: string;
          date_format?: string;
          debit_column?: string | null;
          description_column?: string;
          id?: string;
          statement_import_id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "import_column_mappings_import_fk";
            columns: ["statement_import_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "statement_imports";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
      import_suggestions: {
        Row: {
          amount_minor: number;
          billing_frequency: Database["public"]["Enums"]["billing_frequency"];
          confidence_score: number;
          created_at: string;
          currency: string;
          decision: Database["public"]["Enums"]["import_suggestion_decision"];
          display_name: string;
          id: string;
          next_billing_date: string;
          normalized_merchant: string;
          reason_code: string;
          reason_summary: string;
          start_date: string;
          statement_import_id: string;
          subscription_id: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          amount_minor: number;
          billing_frequency: Database["public"]["Enums"]["billing_frequency"];
          confidence_score: number;
          created_at?: string;
          currency: string;
          decision?: Database["public"]["Enums"]["import_suggestion_decision"];
          display_name: string;
          id?: string;
          next_billing_date: string;
          normalized_merchant: string;
          reason_code: string;
          reason_summary: string;
          start_date: string;
          statement_import_id: string;
          subscription_id?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          amount_minor?: number;
          billing_frequency?: Database["public"]["Enums"]["billing_frequency"];
          confidence_score?: number;
          created_at?: string;
          currency?: string;
          decision?: Database["public"]["Enums"]["import_suggestion_decision"];
          display_name?: string;
          id?: string;
          next_billing_date?: string;
          normalized_merchant?: string;
          reason_code?: string;
          reason_summary?: string;
          start_date?: string;
          statement_import_id?: string;
          subscription_id?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "import_suggestions_import_fk";
            columns: ["statement_import_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "statement_imports";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "import_suggestions_subscription_fk";
            columns: ["subscription_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "subscriptions";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
      merchant_aliases: {
        Row: {
          alias: string;
          created_at: string;
          id: string;
          normalized_merchant: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          alias: string;
          created_at?: string;
          id?: string;
          normalized_merchant: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          alias?: string;
          created_at?: string;
          id?: string;
          normalized_merchant?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string;
          id: string;
          locale: string;
          onboarding_completed_at: string | null;
          preferred_currency: string;
          renewal_reminders_enabled: boolean;
          time_zone: string;
          trial_reminders_enabled: boolean;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          locale?: string;
          onboarding_completed_at?: string | null;
          preferred_currency?: string;
          renewal_reminders_enabled?: boolean;
          time_zone?: string;
          trial_reminders_enabled?: boolean;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          locale?: string;
          onboarding_completed_at?: string | null;
          preferred_currency?: string;
          renewal_reminders_enabled?: boolean;
          time_zone?: string;
          trial_reminders_enabled?: boolean;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      reminders: {
        Row: {
          created_at: string;
          due_at: string;
          id: string;
          read_at: string | null;
          reminder_type: Database["public"]["Enums"]["reminder_type"];
          status: Database["public"]["Enums"]["reminder_status"];
          subscription_id: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          due_at: string;
          id?: string;
          read_at?: string | null;
          reminder_type: Database["public"]["Enums"]["reminder_type"];
          status?: Database["public"]["Enums"]["reminder_status"];
          subscription_id?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          due_at?: string;
          id?: string;
          read_at?: string | null;
          reminder_type?: Database["public"]["Enums"]["reminder_type"];
          status?: Database["public"]["Enums"]["reminder_status"];
          subscription_id?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reminders_subscription_fk";
            columns: ["subscription_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "subscriptions";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
      savings_goals: {
        Row: {
          created_at: string;
          currency: string;
          id: string;
          monthly_target_minor: number;
          realized_monthly_minor: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          currency?: string;
          id?: string;
          monthly_target_minor: number;
          realized_monthly_minor?: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          currency?: string;
          id?: string;
          monthly_target_minor?: number;
          realized_monthly_minor?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      statement_imports: {
        Row: {
          accepted_count: number;
          completed_at: string | null;
          created_at: string;
          file_sha256: string;
          file_size_bytes: number;
          id: string;
          rejected_count: number;
          row_count: number;
          safe_error_code: string | null;
          status: Database["public"]["Enums"]["import_status"];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          accepted_count?: number;
          completed_at?: string | null;
          created_at?: string;
          file_sha256: string;
          file_size_bytes: number;
          id?: string;
          rejected_count?: number;
          row_count?: number;
          safe_error_code?: string | null;
          status?: Database["public"]["Enums"]["import_status"];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          accepted_count?: number;
          completed_at?: string | null;
          created_at?: string;
          file_sha256?: string;
          file_size_bytes?: number;
          id?: string;
          rejected_count?: number;
          row_count?: number;
          safe_error_code?: string | null;
          status?: Database["public"]["Enums"]["import_status"];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      subscription_price_history: {
        Row: {
          confirmed_at: string | null;
          created_at: string;
          detected_at: string;
          id: string;
          new_amount_minor: number;
          percentage_basis_points: number;
          previous_amount_minor: number;
          subscription_id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          confirmed_at?: string | null;
          created_at?: string;
          detected_at?: string;
          id?: string;
          new_amount_minor: number;
          percentage_basis_points: number;
          previous_amount_minor: number;
          subscription_id: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          confirmed_at?: string | null;
          created_at?: string;
          detected_at?: string;
          id?: string;
          new_amount_minor?: number;
          percentage_basis_points?: number;
          previous_amount_minor?: number;
          subscription_id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "price_history_subscription_fk";
            columns: ["subscription_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "subscriptions";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
      subscriptions: {
        Row: {
          amount_minor: number;
          archived_at: string | null;
          billing_frequency: Database["public"]["Enums"]["billing_frequency"];
          cancellation_instructions: string | null;
          cancellation_url: string | null;
          category: string;
          confidence_score: number | null;
          created_at: string;
          currency: string;
          custom_interval_days: number | null;
          display_name: string;
          id: string;
          merchant_name: string;
          next_billing_date: string;
          notes: string | null;
          payment_method_nickname: string | null;
          reminder_lead_days: number;
          source: Database["public"]["Enums"]["subscription_source"];
          source_import_id: string | null;
          start_date: string;
          status: Database["public"]["Enums"]["subscription_status"];
          trial_end_date: string | null;
          updated_at: string;
          user_id: string;
          website: string | null;
        };
        Insert: {
          amount_minor: number;
          archived_at?: string | null;
          billing_frequency: Database["public"]["Enums"]["billing_frequency"];
          cancellation_instructions?: string | null;
          cancellation_url?: string | null;
          category: string;
          confidence_score?: number | null;
          created_at?: string;
          currency?: string;
          custom_interval_days?: number | null;
          display_name: string;
          id?: string;
          merchant_name: string;
          next_billing_date: string;
          notes?: string | null;
          payment_method_nickname?: string | null;
          reminder_lead_days?: number;
          source?: Database["public"]["Enums"]["subscription_source"];
          source_import_id?: string | null;
          start_date: string;
          status?: Database["public"]["Enums"]["subscription_status"];
          trial_end_date?: string | null;
          updated_at?: string;
          user_id: string;
          website?: string | null;
        };
        Update: {
          amount_minor?: number;
          archived_at?: string | null;
          billing_frequency?: Database["public"]["Enums"]["billing_frequency"];
          cancellation_instructions?: string | null;
          cancellation_url?: string | null;
          category?: string;
          confidence_score?: number | null;
          created_at?: string;
          currency?: string;
          custom_interval_days?: number | null;
          display_name?: string;
          id?: string;
          merchant_name?: string;
          next_billing_date?: string;
          notes?: string | null;
          payment_method_nickname?: string | null;
          reminder_lead_days?: number;
          source?: Database["public"]["Enums"]["subscription_source"];
          source_import_id?: string | null;
          start_date?: string;
          status?: Database["public"]["Enums"]["subscription_status"];
          trial_end_date?: string | null;
          updated_at?: string;
          user_id?: string;
          website?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "subscriptions_source_import_fk";
            columns: ["source_import_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "statement_imports";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
      transactions: {
        Row: {
          amount_minor: number;
          created_at: string;
          currency: string;
          id: string;
          normalized_merchant: string;
          statement_import_id: string;
          subscription_id: string | null;
          transaction_date: string;
          transaction_sha256: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          amount_minor: number;
          created_at?: string;
          currency?: string;
          id?: string;
          normalized_merchant: string;
          statement_import_id: string;
          subscription_id?: string | null;
          transaction_date: string;
          transaction_sha256: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          amount_minor?: number;
          created_at?: string;
          currency?: string;
          id?: string;
          normalized_merchant?: string;
          statement_import_id?: string;
          subscription_id?: string | null;
          transaction_date?: string;
          transaction_sha256?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "transactions_import_fk";
            columns: ["statement_import_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "statement_imports";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "transactions_subscription_fk";
            columns: ["subscription_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "subscriptions";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      approve_import_suggestion: {
        Args: {
          category: string;
          expected_updated_at: string;
          suggestion_id: string;
        };
        Returns: string;
      };
      begin_statement_import_attempt: {
        Args: { network_sha256: string };
        Returns: string;
      };
      complete_onboarding: {
        Args: {
          locale: string;
          monthly_budget_minor?: number;
          monthly_savings_goal_minor?: number;
          preferred_currency: string;
          renewal_reminders_enabled: boolean;
          time_zone: string;
          trial_reminders_enabled: boolean;
        };
        Returns: undefined;
      };
      create_statement_import: {
        Args: {
          attempt_id: string;
          duration_bucket: string;
          file_sha256: string;
          file_size_bytes: number;
          mapping: Json;
          suggestions: Json;
          transactions: Json;
        };
        Returns: string;
      };
      discard_statement_import: {
        Args: { statement_import_id: string };
        Returns: undefined;
      };
      finish_statement_import_attempt: {
        Args: { attempt_id: string; safe_result_code: string };
        Returns: undefined;
      };
      merge_import_suggestion: {
        Args: {
          expected_updated_at: string;
          subscription_id: string;
          suggestion_id: string;
        };
        Returns: undefined;
      };
      set_import_suggestion_decision: {
        Args: {
          decision: Database["public"]["Enums"]["import_suggestion_decision"];
          expected_updated_at: string;
          suggestion_id: string;
        };
        Returns: undefined;
      };
      update_import_suggestion: {
        Args: {
          amount_minor: number;
          billing_frequency: Database["public"]["Enums"]["billing_frequency"];
          display_name: string;
          expected_updated_at: string;
          next_billing_date: string;
          start_date: string;
          suggestion_id: string;
        };
        Returns: undefined;
      };
    };
    Enums: {
      billing_frequency:
        | "weekly"
        | "monthly"
        | "every_two_months"
        | "quarterly"
        | "every_six_months"
        | "annual"
        | "custom";
      import_status:
        "mapping" | "processing" | "review" | "completed" | "failed";
      import_suggestion_decision:
        "pending" | "approved" | "merged" | "rejected" | "deferred";
      reminder_status: "pending" | "read" | "dismissed";
      reminder_type:
        | "renewal"
        | "trial_ending"
        | "annual_renewal"
        | "price_increase"
        | "review_later";
      subscription_source: "manual" | "statement_import";
      subscription_status:
        | "trial"
        | "active"
        | "paused"
        | "cancelled"
        | "expired"
        | "needs_review";
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      billing_frequency: [
        "weekly",
        "monthly",
        "every_two_months",
        "quarterly",
        "every_six_months",
        "annual",
        "custom",
      ],
      import_status: ["mapping", "processing", "review", "completed", "failed"],
      import_suggestion_decision: [
        "pending",
        "approved",
        "merged",
        "rejected",
        "deferred",
      ],
      reminder_status: ["pending", "read", "dismissed"],
      reminder_type: [
        "renewal",
        "trial_ending",
        "annual_renewal",
        "price_increase",
        "review_later",
      ],
      subscription_source: ["manual", "statement_import"],
      subscription_status: [
        "trial",
        "active",
        "paused",
        "cancelled",
        "expired",
        "needs_review",
      ],
    },
  },
} as const;
