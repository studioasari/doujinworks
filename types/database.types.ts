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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      bank_accounts: {
        Row: {
          account_holder_name: string
          account_number: string
          account_type: string
          bank_name: string
          branch_name: string
          created_at: string | null
          id: string
          profile_id: string
          updated_at: string | null
        }
        Insert: {
          account_holder_name: string
          account_number: string
          account_type: string
          bank_name: string
          branch_name: string
          created_at?: string | null
          id?: string
          profile_id: string
          updated_at?: string | null
        }
        Update: {
          account_holder_name?: string
          account_number?: string
          account_type?: string
          bank_name?: string
          branch_name?: string
          created_at?: string | null
          id?: string
          profile_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_accounts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bookmarks: {
        Row: {
          created_at: string | null
          id: string
          portfolio_item_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          portfolio_item_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          portfolio_item_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookmarks_portfolio_item_id_fkey"
            columns: ["portfolio_item_id"]
            isOneToOne: false
            referencedRelation: "portfolio_items"
            referencedColumns: ["id"]
          },
        ]
      }
      business_profiles: {
        Row: {
          account_type: string
          address1: string
          address2: string | null
          birth_date: string | null
          company_name: string | null
          created_at: string | null
          first_name: string | null
          first_name_kana: string | null
          gender: string | null
          id: string
          last_name: string | null
          last_name_kana: string | null
          phone: string
          postal_code: string
          prefecture: string
          profile_id: string
          updated_at: string | null
        }
        Insert: {
          account_type: string
          address1: string
          address2?: string | null
          birth_date?: string | null
          company_name?: string | null
          created_at?: string | null
          first_name?: string | null
          first_name_kana?: string | null
          gender?: string | null
          id?: string
          last_name?: string | null
          last_name_kana?: string | null
          phone: string
          postal_code: string
          prefecture: string
          profile_id: string
          updated_at?: string | null
        }
        Update: {
          account_type?: string
          address1?: string
          address2?: string | null
          birth_date?: string | null
          company_name?: string | null
          created_at?: string | null
          first_name?: string | null
          first_name_kana?: string | null
          gender?: string | null
          id?: string
          last_name?: string | null
          last_name_kana?: string | null
          phone?: string
          postal_code?: string
          prefecture?: string
          profile_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_profiles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cancellation_requests: {
        Row: {
          created_at: string | null
          id: string
          reason: string
          requester_id: string
          resolved_at: string | null
          status: string
          work_contract_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          reason: string
          requester_id: string
          resolved_at?: string | null
          status?: string
          work_contract_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          reason?: string
          requester_id?: string
          resolved_at?: string | null
          status?: string
          work_contract_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cancellation_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cancellation_requests_work_contract_id_fkey"
            columns: ["work_contract_id"]
            isOneToOne: false
            referencedRelation: "work_contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_room_participants: {
        Row: {
          chat_room_id: string | null
          hidden: boolean | null
          id: string
          joined_at: string | null
          last_read_at: string | null
          pinned: boolean | null
          profile_id: string | null
        }
        Insert: {
          chat_room_id?: string | null
          hidden?: boolean | null
          id?: string
          joined_at?: string | null
          last_read_at?: string | null
          pinned?: boolean | null
          profile_id?: string | null
        }
        Update: {
          chat_room_id?: string | null
          hidden?: boolean | null
          id?: string
          joined_at?: string | null
          last_read_at?: string | null
          pinned?: boolean | null
          profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_room_participants_chat_room_id_fkey"
            columns: ["chat_room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_room_participants_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_rooms: {
        Row: {
          created_at: string | null
          id: string
          related_request_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          related_request_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          related_request_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_rooms_related_request_id_fkey"
            columns: ["related_request_id"]
            isOneToOne: false
            referencedRelation: "work_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      comment_likes: {
        Row: {
          comment_id: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_likes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comment_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          parent_comment_id: string | null
          portfolio_item_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          parent_comment_id?: string | null
          portfolio_item_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          parent_comment_id?: string | null
          portfolio_item_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_portfolio_item_id_fkey"
            columns: ["portfolio_item_id"]
            isOneToOne: false
            referencedRelation: "portfolio_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      delivery_files: {
        Row: {
          deleted_at: string | null
          file_size: number
          id: string
          mime_type: string
          original_filename: string
          r2_key: string
          scheduled_delete_at: string
          uploaded_at: string
          uploaded_by: string
          warning_1d_sent_at: string | null
          warning_7d_sent_at: string | null
          work_contract_id: string
          work_delivery_id: string
        }
        Insert: {
          deleted_at?: string | null
          file_size: number
          id?: string
          mime_type: string
          original_filename: string
          r2_key: string
          scheduled_delete_at?: string
          uploaded_at?: string
          uploaded_by: string
          warning_1d_sent_at?: string | null
          warning_7d_sent_at?: string | null
          work_contract_id: string
          work_delivery_id: string
        }
        Update: {
          deleted_at?: string | null
          file_size?: number
          id?: string
          mime_type?: string
          original_filename?: string
          r2_key?: string
          scheduled_delete_at?: string
          uploaded_at?: string
          uploaded_by?: string
          warning_1d_sent_at?: string | null
          warning_7d_sent_at?: string | null
          work_contract_id?: string
          work_delivery_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_files_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_files_work_contract_id_fkey"
            columns: ["work_contract_id"]
            isOneToOne: false
            referencedRelation: "work_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_files_work_delivery_id_fkey"
            columns: ["work_delivery_id"]
            isOneToOne: false
            referencedRelation: "work_deliveries"
            referencedColumns: ["id"]
          },
        ]
      }
      drafts: {
        Row: {
          allow_comments: boolean
          audio_url: string | null
          category: string
          created_at: string | null
          creator_id: string
          description: string | null
          id: string
          image_url: string | null
          image_urls: string[] | null
          is_original: boolean
          is_public: boolean
          rating: string
          tags: string[] | null
          text_content: string | null
          title: string | null
          updated_at: string | null
          video_url: string | null
        }
        Insert: {
          allow_comments?: boolean
          audio_url?: string | null
          category: string
          created_at?: string | null
          creator_id: string
          description?: string | null
          id?: string
          image_url?: string | null
          image_urls?: string[] | null
          is_original?: boolean
          is_public?: boolean
          rating?: string
          tags?: string[] | null
          text_content?: string | null
          title?: string | null
          updated_at?: string | null
          video_url?: string | null
        }
        Update: {
          allow_comments?: boolean
          audio_url?: string | null
          category?: string
          created_at?: string | null
          creator_id?: string
          description?: string | null
          id?: string
          image_url?: string | null
          image_urls?: string[] | null
          is_original?: boolean
          is_public?: boolean
          rating?: string
          tags?: string[] | null
          text_content?: string | null
          title?: string | null
          updated_at?: string | null
          video_url?: string | null
        }
        Relationships: []
      }
      follows: {
        Row: {
          created_at: string | null
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string | null
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string | null
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      messages: {
        Row: {
          chat_room_id: string | null
          content: string
          created_at: string | null
          deleted: boolean | null
          file_name: string | null
          file_type: string | null
          file_url: string | null
          id: string
          is_read: boolean | null
          request_card_id: string | null
          sender_id: string | null
        }
        Insert: {
          chat_room_id?: string | null
          content: string
          created_at?: string | null
          deleted?: boolean | null
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          is_read?: boolean | null
          request_card_id?: string | null
          sender_id?: string | null
        }
        Update: {
          chat_room_id?: string | null
          content?: string
          created_at?: string | null
          deleted?: boolean | null
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          is_read?: boolean | null
          request_card_id?: string | null
          sender_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_chat_room_id_fkey"
            columns: ["chat_room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_request_card_id_fkey"
            columns: ["request_card_id"]
            isOneToOne: false
            referencedRelation: "work_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          link: string | null
          message: string
          profile_id: string
          read: boolean | null
          title: string
          type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          link?: string | null
          message: string
          profile_id: string
          read?: boolean | null
          title: string
          type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          link?: string | null
          message?: string
          profile_id?: string
          read?: boolean | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          completed_month: string | null
          created_at: string | null
          creator_id: string
          id: string
          note: string | null
          paid_at: string | null
          status: string
          transfer_fee: number | null
          updated_at: string | null
          work_request_id: string
        }
        Insert: {
          amount: number
          completed_month?: string | null
          created_at?: string | null
          creator_id: string
          id?: string
          note?: string | null
          paid_at?: string | null
          status?: string
          transfer_fee?: number | null
          updated_at?: string | null
          work_request_id: string
        }
        Update: {
          amount?: number
          completed_month?: string | null
          created_at?: string | null
          creator_id?: string
          id?: string
          note?: string | null
          paid_at?: string | null
          status?: string
          transfer_fee?: number | null
          updated_at?: string | null
          work_request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_work_request_id_fkey"
            columns: ["work_request_id"]
            isOneToOne: false
            referencedRelation: "work_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_items: {
        Row: {
          allow_comments: boolean
          audio_duration: number | null
          audio_url: string | null
          category: string | null
          created_at: string | null
          creator_id: string
          deleted_at: string | null
          description: string | null
          external_url: string | null
          id: string
          image_url: string | null
          image_urls: string[] | null
          is_deleted: boolean | null
          is_original: boolean
          is_public: boolean | null
          page_count: number | null
          rating: string
          tags: string[] | null
          text_content: string | null
          thumbnail_url: string | null
          title: string
          updated_at: string | null
          video_duration: number | null
          video_url: string | null
          view_count: number | null
          word_count: number | null
        }
        Insert: {
          allow_comments?: boolean
          audio_duration?: number | null
          audio_url?: string | null
          category?: string | null
          created_at?: string | null
          creator_id: string
          deleted_at?: string | null
          description?: string | null
          external_url?: string | null
          id?: string
          image_url?: string | null
          image_urls?: string[] | null
          is_deleted?: boolean | null
          is_original?: boolean
          is_public?: boolean | null
          page_count?: number | null
          rating?: string
          tags?: string[] | null
          text_content?: string | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string | null
          video_duration?: number | null
          video_url?: string | null
          view_count?: number | null
          word_count?: number | null
        }
        Update: {
          allow_comments?: boolean
          audio_duration?: number | null
          audio_url?: string | null
          category?: string | null
          created_at?: string | null
          creator_id?: string
          deleted_at?: string | null
          description?: string | null
          external_url?: string | null
          id?: string
          image_url?: string | null
          image_urls?: string[] | null
          is_deleted?: boolean | null
          is_original?: boolean
          is_public?: boolean | null
          page_count?: number | null
          rating?: string
          tags?: string[] | null
          text_content?: string | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string | null
          video_duration?: number | null
          video_url?: string | null
          view_count?: number | null
          word_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_items_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      portfolio_likes: {
        Row: {
          created_at: string | null
          id: string
          portfolio_item_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          portfolio_item_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          portfolio_item_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_likes_portfolio_item_id_fkey"
            columns: ["portfolio_item_id"]
            isOneToOne: false
            referencedRelation: "portfolio_items"
            referencedColumns: ["id"]
          },
        ]
      }
      post_categories: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          slug: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          slug: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      posts: {
        Row: {
          category_id: string | null
          content: string
          created_at: string | null
          excerpt: string | null
          id: string
          published_at: string | null
          slug: string
          status: string | null
          thumbnail_url: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          category_id?: string | null
          content: string
          created_at?: string | null
          excerpt?: string | null
          id?: string
          published_at?: string | null
          slug: string
          status?: string | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          category_id?: string | null
          content?: string
          created_at?: string | null
          excerpt?: string | null
          id?: string
          published_at?: string | null
          slug?: string
          status?: string | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "posts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "post_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_plans: {
        Row: {
          category: string
          created_at: string | null
          creator_id: string | null
          description: string
          display_order: number | null
          id: string
          is_public: boolean | null
          minimum_price: number
          plan_name: string
          sample_images: Json | null
          thumbnail_url: string
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          creator_id?: string | null
          description: string
          display_order?: number | null
          id?: string
          is_public?: boolean | null
          minimum_price: number
          plan_name: string
          sample_images?: Json | null
          thumbnail_url: string
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          creator_id?: string | null
          description?: string
          display_order?: number | null
          id?: string
          is_public?: boolean | null
          minimum_price?: number
          plan_name?: string
          sample_images?: Json | null
          thumbnail_url?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pricing_plans_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_type: string | null
          avatar_url: string | null
          ban_reason: string | null
          banned_at: string | null
          bio: string | null
          can_receive_work: boolean | null
          can_request_work: boolean | null
          created_at: string | null
          deleted_at: string | null
          display_name: string | null
          header_url: string | null
          id: string
          is_accepting_orders: boolean | null
          is_admin: boolean | null
          is_banned: boolean | null
          is_locked: boolean | null
          lock_until: string | null
          locked_at: string | null
          notify_comments: boolean | null
          notify_likes: boolean | null
          notify_messages: boolean | null
          notify_requests: boolean | null
          pixiv_url: string | null
          tutorial_completed: boolean | null
          twitter_url: string | null
          updated_at: string | null
          user_id: string
          username: string | null
          website_url: string | null
        }
        Insert: {
          account_type?: string | null
          avatar_url?: string | null
          ban_reason?: string | null
          banned_at?: string | null
          bio?: string | null
          can_receive_work?: boolean | null
          can_request_work?: boolean | null
          created_at?: string | null
          deleted_at?: string | null
          display_name?: string | null
          header_url?: string | null
          id?: string
          is_accepting_orders?: boolean | null
          is_admin?: boolean | null
          is_banned?: boolean | null
          is_locked?: boolean | null
          lock_until?: string | null
          locked_at?: string | null
          notify_comments?: boolean | null
          notify_likes?: boolean | null
          notify_messages?: boolean | null
          notify_requests?: boolean | null
          pixiv_url?: string | null
          tutorial_completed?: boolean | null
          twitter_url?: string | null
          updated_at?: string | null
          user_id: string
          username?: string | null
          website_url?: string | null
        }
        Update: {
          account_type?: string | null
          avatar_url?: string | null
          ban_reason?: string | null
          banned_at?: string | null
          bio?: string | null
          can_receive_work?: boolean | null
          can_request_work?: boolean | null
          created_at?: string | null
          deleted_at?: string | null
          display_name?: string | null
          header_url?: string | null
          id?: string
          is_accepting_orders?: boolean | null
          is_admin?: boolean | null
          is_banned?: boolean | null
          is_locked?: boolean | null
          lock_until?: string | null
          locked_at?: string | null
          notify_comments?: boolean | null
          notify_likes?: boolean | null
          notify_messages?: boolean | null
          notify_requests?: boolean | null
          pixiv_url?: string | null
          tutorial_completed?: boolean | null
          twitter_url?: string | null
          updated_at?: string | null
          user_id?: string
          username?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
      receipt_metadata: {
        Row: {
          addressee: string
          contract_id: string
          created_at: string | null
          generated_at: string | null
          id: string
          purpose: string
          request_id: string | null
        }
        Insert: {
          addressee: string
          contract_id: string
          created_at?: string | null
          generated_at?: string | null
          id?: string
          purpose: string
          request_id?: string | null
        }
        Update: {
          addressee?: string
          contract_id?: string
          created_at?: string | null
          generated_at?: string | null
          id?: string
          purpose?: string
          request_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "receipt_metadata_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "work_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          admin_note: string | null
          created_at: string | null
          description: string | null
          handled_at: string | null
          handled_by: string | null
          id: string
          reason: string
          report_type: string
          reporter_id: string | null
          status: string | null
          target_request_id: string | null
          target_user_id: string | null
          target_work_id: string | null
        }
        Insert: {
          admin_note?: string | null
          created_at?: string | null
          description?: string | null
          handled_at?: string | null
          handled_by?: string | null
          id?: string
          reason: string
          report_type: string
          reporter_id?: string | null
          status?: string | null
          target_request_id?: string | null
          target_user_id?: string | null
          target_work_id?: string | null
        }
        Update: {
          admin_note?: string | null
          created_at?: string | null
          description?: string | null
          handled_at?: string | null
          handled_by?: string | null
          id?: string
          reason?: string
          report_type?: string
          reporter_id?: string | null
          status?: string | null
          target_request_id?: string | null
          target_user_id?: string | null
          target_work_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_handled_by_fkey"
            columns: ["handled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "reports_target_request_id_fkey"
            columns: ["target_request_id"]
            isOneToOne: false
            referencedRelation: "work_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "reports_target_work_id_fkey"
            columns: ["target_work_id"]
            isOneToOne: false
            referencedRelation: "portfolio_items"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string | null
          id: string
          rating: number
          reviewee_id: string
          reviewer_id: string
          work_contract_id: string | null
          work_request_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          id?: string
          rating: number
          reviewee_id: string
          reviewer_id: string
          work_contract_id?: string | null
          work_request_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          id?: string
          rating?: number
          reviewee_id?: string
          reviewer_id?: string
          work_contract_id?: string | null
          work_request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_reviewee_id_fkey"
            columns: ["reviewee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_work_contract_id_fkey"
            columns: ["work_contract_id"]
            isOneToOne: false
            referencedRelation: "work_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_work_request_id_fkey"
            columns: ["work_request_id"]
            isOneToOne: false
            referencedRelation: "work_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_events: {
        Row: {
          error_message: string | null
          event_id: string
          event_type: string
          processed_at: string | null
          received_at: string
          status: string
        }
        Insert: {
          error_message?: string | null
          event_id: string
          event_type: string
          processed_at?: string | null
          received_at?: string
          status?: string
        }
        Update: {
          error_message?: string | null
          event_id?: string
          event_type?: string
          processed_at?: string | null
          received_at?: string
          status?: string
        }
        Relationships: []
      }
      work_applications: {
        Row: {
          applicant_id: string
          created_at: string
          id: string
          message: string
          portfolio_links: string[] | null
          proposed_price: number | null
          request_id: string
          status: string
        }
        Insert: {
          applicant_id: string
          created_at?: string
          id?: string
          message: string
          portfolio_links?: string[] | null
          proposed_price?: number | null
          request_id: string
          status?: string
        }
        Update: {
          applicant_id?: string
          created_at?: string
          id?: string
          message?: string
          portfolio_links?: string[] | null
          proposed_price?: number | null
          request_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_applications_applicant_id_fkey"
            columns: ["applicant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_applications_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "work_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      work_contracts: {
        Row: {
          application_id: string | null
          auto_approval_warning_sent_at: string | null
          checkout_session_id: string | null
          completed_at: string | null
          contracted_at: string | null
          contractor_id: string
          created_at: string | null
          deadline: string | null
          delivered_at: string | null
          delivery_file_urls: string[] | null
          final_price: number
          id: string
          paid_at: string | null
          payment_intent_id: string | null
          refund_id: string | null
          refunded_at: string | null
          status: string
          updated_at: string | null
          work_request_id: string
        }
        Insert: {
          application_id?: string | null
          auto_approval_warning_sent_at?: string | null
          checkout_session_id?: string | null
          completed_at?: string | null
          contracted_at?: string | null
          contractor_id: string
          created_at?: string | null
          deadline?: string | null
          delivered_at?: string | null
          delivery_file_urls?: string[] | null
          final_price: number
          id?: string
          paid_at?: string | null
          payment_intent_id?: string | null
          refund_id?: string | null
          refunded_at?: string | null
          status?: string
          updated_at?: string | null
          work_request_id: string
        }
        Update: {
          application_id?: string | null
          auto_approval_warning_sent_at?: string | null
          checkout_session_id?: string | null
          completed_at?: string | null
          contracted_at?: string | null
          contractor_id?: string
          created_at?: string | null
          deadline?: string | null
          delivered_at?: string | null
          delivery_file_urls?: string[] | null
          final_price?: number
          id?: string
          paid_at?: string | null
          payment_intent_id?: string | null
          refund_id?: string | null
          refunded_at?: string | null
          status?: string
          updated_at?: string | null
          work_request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_contracts_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "work_request_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_contracts_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_contracts_work_request_id_fkey"
            columns: ["work_request_id"]
            isOneToOne: false
            referencedRelation: "work_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      work_deliveries: {
        Row: {
          contractor_id: string
          created_at: string
          delivery_url: string | null
          feedback: string | null
          id: string
          message: string
          status: string
          work_contract_id: string | null
          work_request_id: string
        }
        Insert: {
          contractor_id: string
          created_at?: string
          delivery_url?: string | null
          feedback?: string | null
          id?: string
          message: string
          status: string
          work_contract_id?: string | null
          work_request_id: string
        }
        Update: {
          contractor_id?: string
          created_at?: string
          delivery_url?: string | null
          feedback?: string | null
          id?: string
          message?: string
          status?: string
          work_contract_id?: string | null
          work_request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_deliveries_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_deliveries_work_contract_id_fkey"
            columns: ["work_contract_id"]
            isOneToOne: false
            referencedRelation: "work_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_deliveries_work_request_id_fkey"
            columns: ["work_request_id"]
            isOneToOne: false
            referencedRelation: "work_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      work_request_applications: {
        Row: {
          applicant_id: string
          created_at: string | null
          id: string
          message: string | null
          proposed_deadline: string | null
          proposed_price: number | null
          rejected_at: string | null
          rejection_reason: string | null
          status: string | null
          work_request_id: string
        }
        Insert: {
          applicant_id: string
          created_at?: string | null
          id?: string
          message?: string | null
          proposed_deadline?: string | null
          proposed_price?: number | null
          rejected_at?: string | null
          rejection_reason?: string | null
          status?: string | null
          work_request_id: string
        }
        Update: {
          applicant_id?: string
          created_at?: string | null
          id?: string
          message?: string | null
          proposed_deadline?: string | null
          proposed_price?: number | null
          rejected_at?: string | null
          rejection_reason?: string | null
          status?: string | null
          work_request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_request_applications_applicant_id_fkey"
            columns: ["applicant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_request_applications_work_request_id_fkey"
            columns: ["work_request_id"]
            isOneToOne: false
            referencedRelation: "work_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      work_requests: {
        Row: {
          application_deadline: string | null
          attached_file_urls: string[] | null
          auto_approval_warning_sent_at: string | null
          budget_max: number | null
          budget_min: number | null
          category: string
          completed_at: string | null
          contracted_at: string | null
          contracted_count: number | null
          created_at: string
          deadline: string | null
          deleted_at: string | null
          delivered_at: string | null
          delivery_file_urls: string[] | null
          delivery_message: string | null
          description: string
          escrow_transaction_id: string | null
          estimated_hours: number | null
          final_price: number | null
          hourly_rate_max: number | null
          hourly_rate_min: number | null
          id: string
          is_deleted: boolean | null
          job_features: string[] | null
          number_of_positions: number | null
          paid_at: string | null
          payment_intent_id: string | null
          payment_type: string | null
          price_negotiable: boolean | null
          progress_status: string
          recruitment_status: string
          reference_urls: string[] | null
          refund_id: string | null
          request_type: string
          requester_id: string
          required_skills: string[] | null
          selected_applicant_id: string | null
          target_creator_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          application_deadline?: string | null
          attached_file_urls?: string[] | null
          auto_approval_warning_sent_at?: string | null
          budget_max?: number | null
          budget_min?: number | null
          category: string
          completed_at?: string | null
          contracted_at?: string | null
          contracted_count?: number | null
          created_at?: string
          deadline?: string | null
          deleted_at?: string | null
          delivered_at?: string | null
          delivery_file_urls?: string[] | null
          delivery_message?: string | null
          description: string
          escrow_transaction_id?: string | null
          estimated_hours?: number | null
          final_price?: number | null
          hourly_rate_max?: number | null
          hourly_rate_min?: number | null
          id?: string
          is_deleted?: boolean | null
          job_features?: string[] | null
          number_of_positions?: number | null
          paid_at?: string | null
          payment_intent_id?: string | null
          payment_type?: string | null
          price_negotiable?: boolean | null
          progress_status?: string
          recruitment_status?: string
          reference_urls?: string[] | null
          refund_id?: string | null
          request_type: string
          requester_id: string
          required_skills?: string[] | null
          selected_applicant_id?: string | null
          target_creator_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          application_deadline?: string | null
          attached_file_urls?: string[] | null
          auto_approval_warning_sent_at?: string | null
          budget_max?: number | null
          budget_min?: number | null
          category?: string
          completed_at?: string | null
          contracted_at?: string | null
          contracted_count?: number | null
          created_at?: string
          deadline?: string | null
          deleted_at?: string | null
          delivered_at?: string | null
          delivery_file_urls?: string[] | null
          delivery_message?: string | null
          description?: string
          escrow_transaction_id?: string | null
          estimated_hours?: number | null
          final_price?: number | null
          hourly_rate_max?: number | null
          hourly_rate_min?: number | null
          id?: string
          is_deleted?: boolean | null
          job_features?: string[] | null
          number_of_positions?: number | null
          paid_at?: string | null
          payment_intent_id?: string | null
          payment_type?: string | null
          price_negotiable?: boolean | null
          progress_status?: string
          recruitment_status?: string
          reference_urls?: string[] | null
          refund_id?: string | null
          request_type?: string
          requester_id?: string
          required_skills?: string[] | null
          selected_applicant_id?: string | null
          target_creator_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_requests_selected_applicant_id_fkey"
            columns: ["selected_applicant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_requests_target_creator_id_fkey"
            columns: ["target_creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_insert_participant: {
        Args: { new_profile_id: string; room_id: string }
        Returns: boolean
      }
      can_view_profile: { Args: { profile_id: string }; Returns: boolean }
      delete_unconfirmed_users: { Args: never; Returns: undefined }
      get_user_chat_rooms: {
        Args: never
        Returns: {
          chat_room_id: string
        }[]
      }
      increment_view_count: { Args: { item_id: string }; Returns: undefined }
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
