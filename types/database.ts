// ============================================================
// Supabase generated-style Database type
// Manually written for v1; replace with `supabase gen types` output
// once the Supabase project is created.
// ============================================================

export type Database = {
  public: {
    Tables: {
      groups: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          created_by: string;
          created_at?: string;
        };
        Update: {
          name?: string;
          description?: string | null;
        };
      };
      group_members: {
        Row: {
          group_id: string;
          user_id: string;
          role: "admin" | "member";
          joined_at: string;
        };
        Insert: {
          group_id: string;
          user_id: string;
          role?: "admin" | "member";
          joined_at?: string;
        };
        Update: {
          role?: "admin" | "member";
        };
      };
      wallets: {
        Row: {
          id: string;
          user_id: string;
          group_id: string;
          balance: number;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          group_id: string;
          balance?: number;
          updated_at?: string;
        };
        Update: {
          balance?: number;
          updated_at?: string;
        };
      };
      markets: {
        Row: {
          id: string;
          group_id: string;
          creator_id: string;
          question: string;
          description: string | null;
          status: "open" | "closed" | "resolved";
          outcome: "YES" | "NO" | null;
          b_liquidity: number;
          q_yes: number;
          q_no: number;
          close_time: string;
          resolved_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          creator_id: string;
          question: string;
          description?: string | null;
          status?: "open" | "closed" | "resolved";
          outcome?: "YES" | "NO" | null;
          b_liquidity?: number;
          q_yes?: number;
          q_no?: number;
          close_time: string;
          resolved_at?: string | null;
          created_at?: string;
        };
        Update: {
          status?: "open" | "closed" | "resolved";
          outcome?: "YES" | "NO" | null;
          q_yes?: number;
          q_no?: number;
          resolved_at?: string | null;
        };
      };
      trades: {
        Row: {
          id: string;
          market_id: string;
          user_id: string;
          outcome: "YES" | "NO";
          shares: number;
          cost: number;
          note: string;
          price_yes_before: number;
          price_yes_after: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          market_id: string;
          user_id: string;
          outcome: "YES" | "NO";
          shares: number;
          cost: number;
          note: string;
          price_yes_before: number;
          price_yes_after: number;
          created_at?: string;
        };
        Update: Record<string, never>;
      };
      positions: {
        Row: {
          id: string;
          market_id: string;
          user_id: string;
          yes_shares: number;
          no_shares: number;
          updated_at: string;
        };
        Insert: {
          id?: string;
          market_id: string;
          user_id: string;
          yes_shares?: number;
          no_shares?: number;
          updated_at?: string;
        };
        Update: {
          yes_shares?: number;
          no_shares?: number;
          updated_at?: string;
        };
      };
      claims: {
        Row: {
          id: string;
          market_id: string;
          user_id: string;
          amount: number;
          claimed_at: string;
        };
        Insert: {
          id?: string;
          market_id: string;
          user_id: string;
          amount: number;
          claimed_at?: string;
        };
        Update: Record<string, never>;
      };
      price_snapshots: {
        Row: {
          id: string;
          market_id: string;
          price_yes: number;
          price_no: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          market_id: string;
          price_yes: number;
          price_no: number;
          created_at?: string;
        };
        Update: Record<string, never>;
      };
      group_invites: {
        Row: {
          id: string;
          group_id: string;
          token: string;
          created_by: string;
          expires_at: string | null;
          max_uses: number | null;
          use_count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          token: string;
          created_by: string;
          expires_at?: string | null;
          max_uses?: number | null;
          use_count?: number;
          created_at?: string;
        };
        Update: {
          use_count?: number;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      market_status: "open" | "closed" | "resolved";
      outcome_type: "YES" | "NO";
      member_role: "admin" | "member";
    };
  };
};
