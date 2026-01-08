import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getDb, schema } from "@/lib/db"
import { eq, and } from "drizzle-orm"

// GET - Obtener documentos de un cliente
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: clienteId } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

    const db = getDb()

    // Verificar acceso al cliente
    if (profile?.role !== "super_admin") {
      const [cliente] = await db
        .select()
        .from(schema.clientes)
        .where(and(eq(schema.clientes.id, clienteId), eq(schema.clientes.authUserId, user.id)))

      if (!cliente) {
        return NextResponse.json({ error: "No tienes acceso" }, { status: 403 })
      }
    }

    const documentos = await db.select().from(schema.documentos).where(eq(schema.documentos.clienteId, clienteId))

    return NextResponse.json(documentos)
  } catch (error) {
    console.error("Error fetching documentos:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

// POST - Subir documento (solo admin)
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: clienteId } = await params
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

    const formData = await request.formData()
    const file = formData.get("file") as File
    const nombre = formData.get("nombre") as string
    const descripcion = formData.get("descripcion") as string

    if (!file || !nombre) {
      return NextResponse.json({ error: "Archivo y nombre son requeridos" }, { status: 400 })
    }

    // Generar ruta única para el archivo
    const fileExt = file.name.split(".").pop()
    const fileName = `${clienteId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

    // Subir archivo a Supabase Storage
    const { error: uploadError } = await supabase.storage.from("documentos").upload(fileName, file, {
      contentType: file.type,
      upsert: false,
    })

    if (uploadError) {
      console.error("Upload error:", uploadError)
      return NextResponse.json({ error: "Error al subir archivo" }, { status: 500 })
    }

    // Guardar registro en la base de datos
    const db = getDb()
    const [newDocumento] = await db
      .insert(schema.documentos)
      .values({
        clienteId,
        nombre,
        descripcion,
        storagePath: fileName,
        nombreArchivo: file.name,
        tamano: file.size.toString(),
        mimeType: file.type,
        subidoPor: user.id,
      })
      .returning()

    return NextResponse.json(newDocumento, { status: 201 })
  } catch (error) {
    console.error("Error uploading documento:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
