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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          balance: number
          created_at: string
          currency: string
          id: string
          is_active: boolean
          is_primary: boolean
          name: string
          type: Database["public"]["Enums"]["account_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          currency?: string
          id?: string
          is_active?: boolean
          is_primary?: boolean
          name: string
          type: Database["public"]["Enums"]["account_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          currency?: string
          id?: string
          is_active?: boolean
          is_primary?: boolean
          name?: string
          type?: Database["public"]["Enums"]["account_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          color: string | null
          created_at: string
          id: string
          monthly_budget: number | null
          name: string
          parent_category: string | null
          type: string
          user_id: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          monthly_budget?: number | null
          name: string
          parent_category?: string | null
          type: string
          user_id?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          monthly_budget?: number | null
          name?: string
          parent_category?: string | null
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      category_group_mappings: {
        Row: {
          category_id: string
          created_at: string
          group_id: string
          id: string
          user_id: string
        }
        Insert: {
          category_id: string
          created_at?: string
          group_id: string
          id?: string
          user_id: string
        }
        Update: {
          category_id?: string
          created_at?: string
          group_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "category_group_mappings_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "category_group_mappings_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "category_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      category_groups: {
        Row: {
          color: string
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      import_batch_details: {
        Row: {
          created_at: string
          error_code: string | null
          id: string
          import_batch_id: string
          matched_transaction_id: string | null
          original_data: Json
          parsed_transaction: Json | null
          reason: string | null
          retry_count: number
          row_number: number
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          error_code?: string | null
          id?: string
          import_batch_id: string
          matched_transaction_id?: string | null
          original_data: Json
          parsed_transaction?: Json | null
          reason?: string | null
          retry_count?: number
          row_number: number
          status: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          error_code?: string | null
          id?: string
          import_batch_id?: string
          matched_transaction_id?: string | null
          original_data?: Json
          parsed_transaction?: Json | null
          reason?: string | null
          retry_count?: number
          row_number?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "import_batch_details_import_batch_id_fkey"
            columns: ["import_batch_id"]
            isOneToOne: false
            referencedRelation: "import_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      import_batches: {
        Row: {
          ambiguous_count: number
          content_hash: string | null
          created_at: string
          duplicate_count: number
          error_code: string | null
          error_message: string | null
          failed_count: number
          file_size: number | null
          filename: string
          id: string
          idempotency_key: string
          import_timestamp: string
          imported_count: number
          is_undone: boolean
          last_retry_at: string | null
          mime_type: string | null
          parsed_count: number
          retry_count: number
          skipped_count: number
          status: string
          storage_bucket: string
          storage_path: string
          total_rows: number
          undo_actor: string | null
          undo_transaction_ids: string[] | null
          undone_at: string | null
          updated_at: string
          user_id: string
          valid_rows: number
        }
        Insert: {
          ambiguous_count?: number
          content_hash?: string | null
          created_at?: string
          duplicate_count?: number
          error_code?: string | null
          error_message?: string | null
          failed_count?: number
          file_size?: number | null
          filename: string
          id?: string
          idempotency_key: string
          import_timestamp?: string
          imported_count?: number
          is_undone?: boolean
          last_retry_at?: string | null
          mime_type?: string | null
          parsed_count?: number
          retry_count?: number
          skipped_count?: number
          status?: string
          storage_bucket?: string
          storage_path: string
          total_rows: number
          undo_actor?: string | null
          undo_transaction_ids?: string[] | null
          undone_at?: string | null
          updated_at?: string
          user_id: string
          valid_rows?: number
        }
        Update: {
          ambiguous_count?: number
          content_hash?: string | null
          created_at?: string
          duplicate_count?: number
          error_code?: string | null
          error_message?: string | null
          failed_count?: number
          file_size?: number | null
          filename?: string
          id?: string
          idempotency_key?: string
          import_timestamp?: string
          imported_count?: number
          is_undone?: boolean
          last_retry_at?: string | null
          mime_type?: string | null
          parsed_count?: number
          retry_count?: number
          skipped_count?: number
          status?: string
          storage_bucket?: string
          storage_path?: string
          total_rows?: number
          undo_actor?: string | null
          undo_transaction_ids?: string[] | null
          undone_at?: string | null
          updated_at?: string
          user_id?: string
          valid_rows?: number
        }
        Relationships: []
      }
      plaid_items: {
        Row: {
          access_token: string
          created_at: string
          id: string
          item_id: string
          user_id: string | null
        }
        Insert: {
          access_token: string
          created_at?: string
          id?: string
          item_id: string
          user_id?: string | null
        }
        Update: {
          access_token?: string
          created_at?: string
          id?: string
          item_id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      stores: {
        Row: {
          category_name: string
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          category_name: string
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          category_name?: string
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      transactions: {
        Row: {
          account_id: string | null
          amount: number
          category: string
          created_at: string
          date: string
          description: string
          id: string
          import_batch_id: string | null
          income_category: string | null
          linked_transaction_id: string | null
          reimbursement_expected_date: string | null
          status: string
          transaction_type: string
          transfer_pair_id: string | null
          type: string
          user_id: string | null
        }
        Insert: {
          account_id?: string | null
          amount: number
          category: string
          created_at?: string
          date?: string
          description: string
          id?: string
          import_batch_id?: string | null
          income_category?: string | null
          linked_transaction_id?: string | null
          reimbursement_expected_date?: string | null
          status?: string
          transaction_type?: string
          transfer_pair_id?: string | null
          type: string
          user_id?: string | null
        }
        Update: {
          account_id?: string | null
          amount?: number
          category?: string
          created_at?: string
          date?: string
          description?: string
          id?: string
          import_batch_id?: string | null
          income_category?: string | null
          linked_transaction_id?: string | null
          reimbursement_expected_date?: string | null
          status?: string
          transaction_type?: string
          transfer_pair_id?: string | null
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_import_batch_id_fkey"
            columns: ["import_batch_id"]
            isOneToOne: false
            referencedRelation: "import_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_linked_transaction_id_fkey"
            columns: ["linked_transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_import_batch: {
        Args: { p_batch_id: string; p_force?: boolean; p_user_id: string }
        Returns: {
          deleted_transaction_ids: string[]
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      transaction_balance_effect: {
        Args: { r: Database["public"]["Tables"]["transactions"]["Row"] }
        Returns: number
      }
    }
    Enums: {
      account_type:
        | "checking"
        | "savings"
        | "credit_card"
        | "investment"
        | "cash"
        | "other"
      app_role: "admin" | "user"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      account_type: [
        "checking",
        "savings",
        "credit_card",
        "investment",
        "cash",
        "other",
      ],
      app_role: ["admin", "user"],
    },
  },
} as const
