import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getDb, schema } from "@/lib/db"
import { eq } from "drizzle-orm"
import { decryptPassword } from "@/lib/crypto"

// GET - Obtener contraseña desencriptada (solo super_admin)
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
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
    const [admin] = await db
      .select({ passwordEncrypted: schema.admins.passwordEncrypted })
      .from(schema.admins)
      .where(eq(schema.admins.id, id))

    if (!admin || !admin.passwordEncrypted) {
      return NextResponse.json({ error: "Contraseña no encontrada" }, { status: 404 })
    }

    const password = decryptPassword(admin.passwordEncrypted)

    return NextResponse.json({ password })
  } catch (error) {
    console.error("Error fetching password:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
