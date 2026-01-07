"use client"

import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from "react"
import { createClient } from "@/lib/supabase/client"
import type { User as SupabaseUser } from "@supabase/supabase-js"

type UserRole = "user" | "super_admin" | null

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

  const supabase = createClient()

  const fetchUserProfile = async (authUser: SupabaseUser) => {
    try {
      const { data: profile, error } = await supabase.from("profiles").select("*").eq("id", authUser.id).single()

      if (!isMountedRef.current) return

      if (profile && !error) {
        setUser({
          id: authUser.id,
          name: profile.display_name || authUser.email?.split("@")[0] || "Usuario",
          email: authUser.email || "",
          role: profile.role as UserRole,
        })
      } else {
        // Fallback if no profile exists yet or error occurred
        setUser({
          id: authUser.id,
          name: authUser.email?.split("@")[0] || "Usuario",
          email: authUser.email || "",
          role: "user",
        })
      }
    } catch (err) {
      if (!isMountedRef.current) return
      console.error("Error fetching profile:", err)
      // Set fallback user on error
      setUser({
        id: authUser.id,
        name: authUser.email?.split("@")[0] || "Usuario",
        email: authUser.email || "",
        role: "user",
      })
    }
  }

  const refreshUser = async () => {
    try {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser()
      if (authUser && isMountedRef.current) {
        setSupabaseUser(authUser)
        await fetchUserProfile(authUser)
      }
    } catch (err) {
      if (!isMountedRef.current) return
      console.error("Error refreshing user:", err)
    }
  }

  useEffect(() => {
    isMountedRef.current = true

    const initAuth = async () => {
      try {
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser()

        if (!isMountedRef.current) return

        if (authUser) {
          setSupabaseUser(authUser)
          await fetchUserProfile(authUser)
        }
      } catch (err) {
        if (!isMountedRef.current) return
        console.error("Error initializing auth:", err)
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
  }, [])

  const logout = async () => {
    try {
      await supabase.auth.signOut()
      if (isMountedRef.current) {
        setUser(null)
        setSupabaseUser(null)
      }
    } catch (err) {
      console.error("Error logging out:", err)
    }
  }

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
