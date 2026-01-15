"use client";

/**
 * User Hook
 *
 * Provides access to the current authenticated user on the client side.
 * Uses Supabase Auth to get the user session.
 *
 * Note: For server components, use createClient from @/lib/supabase/server
 * and call supabase.auth.getUser() directly.
 */

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

// ============================================================================
// Query Keys
// ============================================================================

export const userKeys = {
  all: ["user"] as const,
  current: () => [...userKeys.all, "current"] as const,
  profile: (userId: string) => [...userKeys.all, "profile", userId] as const,
};

// ============================================================================
// Types
// ============================================================================

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  institution: string | null;
  department: string | null;
  role: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook to get the current authenticated user
 *
 * Returns the Supabase auth user object with id, email, etc.
 */
export function useUser() {
  const supabase = createClient();

  const query = useQuery({
    queryKey: userKeys.current(),
    queryFn: async (): Promise<User | null> => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error) {
        console.error("[useUser] Auth error:", error);
        return null;
      }

      return user;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
    refetchOnWindowFocus: false,
    retry: 1,
  });

  return {
    user: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

/**
 * Hook to get the current user's profile from the profiles table
 *
 * Returns extended profile information like institution, department, etc.
 */
export function useUserProfile() {
  const supabase = createClient();
  const { user } = useUser();

  const query = useQuery({
    queryKey: userKeys.profile(user?.id ?? ""),
    queryFn: async (): Promise<UserProfile | null> => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) {
        // Profile might not exist yet
        if (error.code === "PGRST116") {
          return null;
        }
        console.error("[useUserProfile] Error fetching profile:", error);
        throw error;
      }

      return data as UserProfile;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  return {
    profile: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

/**
 * Hook to check if user is authenticated
 *
 * Lightweight check without fetching full user data
 */
export function useIsAuthenticated() {
  const { user, isLoading } = useUser();
  return {
    isAuthenticated: !!user,
    isLoading,
  };
}

/**
 * Hook to get user's display name
 *
 * Falls back to email if name is not set
 */
export function useDisplayName() {
  const { user } = useUser();
  const { profile } = useUserProfile();

  if (profile?.full_name) {
    return profile.full_name;
  }

  if (user?.user_metadata?.full_name) {
    return user.user_metadata.full_name as string;
  }

  if (user?.email) {
    return user.email.split("@")[0];
  }

  return "User";
}
