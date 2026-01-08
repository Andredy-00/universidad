import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getDb, schema } from "@/lib/db"
import { eq } from "drizzle-orm"

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
    const db = getDb()

    // Obtener proceso
    const [proceso] = await db.select().from(schema.procesosJuridicos).where(eq(schema.procesosJuridicos.id, id))

    if (!proceso || !proceso.storagePath) {
      return NextResponse.json({ error: "Proceso o archivo no encontrado" }, { status: 404 })
    }

    // Verificar acceso
    if (profile?.role !== "super_admin") {
      // Usuario normal solo puede ver sus procesos
      const [cliente] = await db
        .select({ id: schema.clientes.id })
        .from(schema.clientes)
        .where(eq(schema.clientes.authUserId, user.id))

      if (!cliente || cliente.id !== proceso.clienteId) {
        return NextResponse.json({ error: "No tienes acceso a este proceso" }, { status: 403 })
      }
    }

    // Obtener URL de descarga
    const { data } = await supabase.storage.from("documentos").createSignedUrl(proceso.storagePath, 60) // 60 segundos

    if (!data?.signedUrl) {
      return NextResponse.json({ error: "Error al obtener URL de descarga" }, { status: 500 })
    }

    return NextResponse.json({ url: data.signedUrl, filename: proceso.nombreArchivo })
  } catch (error) {
    console.error("Error downloading proceso:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
