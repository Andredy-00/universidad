"use client"

import { createContext, useContext, useState, useEffect, useRef, useCallback, type ReactNode } from "react"
import { createClient } from "@/lib/supabase/client"
import type { User as SupabaseUser } from "@supabase/supabase-js"

type UserRole = "user" | "admin" | "super_admin" | null

interface User {
  id: string
  name: string
  email: string
  role: UserRole
}

interface AuthContextType {
  user: User | null
  supabaseUser: SupabaseUser | null
  isAuthenticated: boolean
  isLoading: boolean
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const isMountedRef = useRef(true)
  const supabaseRef = useRef(createClient())

  const fetchUserProfile = useCallback(async (authUser: SupabaseUser) => {
    if (!isMountedRef.current) return

    try {
      const { data: profile, error } = await supabaseRef.current
        .from("profiles")
        .select("*")
        .eq("id", authUser.id)
        .single()

      if (!isMountedRef.current) return

      if (profile && !error) {
        setUser({
          id: authUser.id,
          name: profile.display_name || authUser.email?.split("@")[0] || "Usuario",
          email: authUser.email || "",
          role: profile.role as UserRole,
        })
      } else {
        setUser({
          id: authUser.id,
          name: authUser.email?.split("@")[0] || "Usuario",
          email: authUser.email || "",
          role: "user",
        })
      }
    } catch {
      if (!isMountedRef.current) return
      setUser({
        id: authUser.id,
        name: authUser.email?.split("@")[0] || "Usuario",
        email: authUser.email || "",
        role: "user",
      })
    }
  }, [])

  const refreshUser = useCallback(async () => {
    if (!isMountedRef.current) return
    try {
      const {
        data: { user: authUser },
      } = await supabaseRef.current.auth.getUser()
      if (authUser && isMountedRef.current) {
        setSupabaseUser(authUser)
        await fetchUserProfile(authUser)
      }
    } catch {
      // Silently ignore abort errors
    }
  }, [fetchUserProfile])

  useEffect(() => {
    isMountedRef.current = true
    const supabase = supabaseRef.current

    const initAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!isMountedRef.current) return

        if (session?.user) {
          setSupabaseUser(session.user)
          await fetchUserProfile(session.user)
        }
      } catch {
        // Silently ignore errors on unmount
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false)
        }
      }
    }

    initAuth()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMountedRef.current) return

      if (event === "SIGNED_IN" && session?.user) {
        setSupabaseUser(session.user)
        await fetchUserProfile(session.user)
      } else if (event === "SIGNED_OUT") {
        setUser(null)
        setSupabaseUser(null)
      }
    })

    return () => {
      isMountedRef.current = false
      subscription.unsubscribe()
    }
  }, [fetchUserProfile])

  const logout = useCallback(async () => {
    try {
      await supabaseRef.current.auth.signOut()
      if (isMountedRef.current) {
        setUser(null)
        setSupabaseUser(null)
      }
    } catch {
      // Ignore errors
    }
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        supabaseUser,
        isAuthenticated: !!user,
        isLoading,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
