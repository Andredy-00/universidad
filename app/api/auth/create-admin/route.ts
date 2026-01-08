import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

// This endpoint creates the initial admin user
// Only run once during setup
export async function POST() {
  // Use service role key to bypass RLS and create user
  const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  try {
    // Create the admin user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: "admin@universidad.edu",
      password: "123456789",
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        display_name: "Administrador",
        role: "super_admin",
      },
    })

    if (authError) {
      // If user already exists, try to update profile instead
      if (authError.message.includes("already been registered")) {
        // Get existing user
        const { data: users } = await supabaseAdmin.auth.admin.listUsers()
        const adminUser = users?.users?.find((u) => u.email === "admin@universidad.edu")

        if (adminUser) {
          // Update profile to super_admin
          await supabaseAdmin.from("profiles").upsert({
            id: adminUser.id,
            email: "admin@universidad.edu",
            display_name: "Administrador",
            role: "super_admin",
          })

          return NextResponse.json({
            success: true,
            message: "Admin user already exists, profile updated to super_admin",
          })
        }
      }
      throw authError
    }

    // Create/update profile with super_admin role
    if (authData.user) {
      await supabaseAdmin.from("profiles").upsert({
        id: authData.user.id,
        email: "admin@universidad.edu",
        display_name: "Administrador",
        role: "super_admin",
      })
    }

    return NextResponse.json({
      success: true,
      message: "Admin user created successfully",
      user: {
        email: "admin@universidad.edu",
        role: "super_admin",
      },
    })
  } catch (error) {
    console.error("Error creating admin:", error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
