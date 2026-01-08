import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getAdminClient } from "@/lib/supabase/admin"
import { getDb, schema } from "@/lib/db"
import { eq } from "drizzle-orm"

// DELETE - Eliminar admin (solo super_admin)
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

    if (profile?.role !== "super_admin") {
      return NextResponse.json({ error: "No tienes permisos" }, { status: 403 })
    }

    const db = getDb()

    const [admin] = await db.select().from(schema.admins).where(eq(schema.admins.id, id))

    if (!admin) {
      return NextResponse.json({ error: "Admin no encontrado" }, { status: 404 })
    }

    const adminClient = getAdminClient()

    // Eliminar el usuario de Supabase Auth
    if (admin.authUserId) {
      await adminClient.auth.admin.deleteUser(admin.authUserId)
    }

    // Eliminar admin
    await db.delete(schema.admins).where(eq(schema.admins.id, id))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting admin:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
