import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getDb, schema } from "@/lib/db"
import { eq, and } from "drizzle-orm"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: documentoId } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

    const db = getDb()

    // Obtener el documento
    const [documento] = await db.select().from(schema.documentos).where(eq(schema.documentos.id, documentoId))

    if (!documento) {
      return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 })
    }

    // Verificar acceso
    if (profile?.role !== "super_admin") {
      // Verificar que el usuario tiene acceso al cliente
      const [cliente] = await db
        .select()
        .from(schema.clientes)
        .where(and(eq(schema.clientes.id, documento.clienteId), eq(schema.clientes.authUserId, user.id)))

      if (!cliente) {
        return NextResponse.json({ error: "No tienes acceso" }, { status: 403 })
      }
    }

    // Generar URL firmada para descarga
    const { data: signedUrl, error: signError } = await supabase.storage
      .from("documentos")
      .createSignedUrl(documento.storagePath, 60) // URL válida por 60 segundos

    if (signError || !signedUrl) {
      console.error("Error creating signed URL:", signError)
      return NextResponse.json({ error: "Error al generar enlace de descarga" }, { status: 500 })
    }

    return NextResponse.json({
      url: signedUrl.signedUrl,
      nombreArchivo: documento.nombreArchivo,
    })
  } catch (error) {
    console.error("Error downloading documento:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
