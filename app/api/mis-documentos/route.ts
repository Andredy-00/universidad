import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getDb, schema } from "@/lib/db"
import { eq } from "drizzle-orm"

// GET - Obtener documentos del usuario autenticado
export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const db = getDb()

    // Buscar el cliente asociado al usuario
    const [cliente] = await db.select().from(schema.clientes).where(eq(schema.clientes.authUserId, user.id))

    if (!cliente) {
      // El usuario no tiene un cliente asociado, retornar array vacío
      return NextResponse.json([])
    }

    // Obtener documentos del cliente
    const documentos = await db.select().from(schema.documentos).where(eq(schema.documentos.clienteId, cliente.id))

    return NextResponse.json(documentos)
  } catch (error) {
    console.error("Error fetching mis documentos:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
