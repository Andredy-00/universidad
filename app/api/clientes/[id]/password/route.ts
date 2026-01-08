import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getDb, schema } from "@/lib/db"
import { eq } from "drizzle-orm"
import { decryptPassword } from "@/lib/crypto"

// GET - Obtener contraseña de un cliente (solo super admin)
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

    // Verificar que es super admin
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

    if (profile?.role !== "super_admin") {
      return NextResponse.json({ error: "No tienes permisos" }, { status: 403 })
    }

    const db = getDb()
    const [cliente] = await db
      .select({ passwordEncrypted: schema.clientes.passwordEncrypted })
      .from(schema.clientes)
      .where(eq(schema.clientes.id, id))

    if (!cliente || !cliente.passwordEncrypted) {
      return NextResponse.json({ error: "Cliente no encontrado o sin contraseña" }, { status: 404 })
    }

    // Desencriptar y retornar
    const password = decryptPassword(cliente.passwordEncrypted)

    return NextResponse.json({ password })
  } catch (error) {
    console.error("Error getting password:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
