import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getDb, schema } from "@/lib/db"
import { eq, desc } from "drizzle-orm"

// GET - Obtener procesos (admin ve todos, usuario ve solo los suyos)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const clienteId = searchParams.get("clienteId")

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
    const db = getDb()

    if (profile?.role === "super_admin") {
      // Admin puede ver procesos de cualquier cliente
      if (clienteId) {
        const procesos = await db
          .select()
          .from(schema.procesosJuridicos)
          .where(eq(schema.procesosJuridicos.clienteId, clienteId))
          .orderBy(desc(schema.procesosJuridicos.createdAt))
        return NextResponse.json(procesos)
      } else {
        // Sin filtro, obtener todos con info del cliente
        const procesos = await db
          .select({
            id: schema.procesosJuridicos.id,
            createdAt: schema.procesosJuridicos.createdAt,
            caso: schema.procesosJuridicos.caso,
            estado: schema.procesosJuridicos.estado,
            nota: schema.procesosJuridicos.nota,
            storagePath: schema.procesosJuridicos.storagePath,
            nombreArchivo: schema.procesosJuridicos.nombreArchivo,
            clienteId: schema.procesosJuridicos.clienteId,
            clienteNombre: schema.clientes.nombre,
          })
          .from(schema.procesosJuridicos)
          .leftJoin(schema.clientes, eq(schema.procesosJuridicos.clienteId, schema.clientes.id))
          .orderBy(desc(schema.procesosJuridicos.createdAt))
        return NextResponse.json(procesos)
      }
    } else {
      // Usuario normal solo ve sus procesos
      const [cliente] = await db
        .select({ id: schema.clientes.id })
        .from(schema.clientes)
        .where(eq(schema.clientes.authUserId, user.id))

      if (!cliente) {
        return NextResponse.json([])
      }

      const procesos = await db
        .select()
        .from(schema.procesosJuridicos)
        .where(eq(schema.procesosJuridicos.clienteId, cliente.id))
        .orderBy(desc(schema.procesosJuridicos.createdAt))
      return NextResponse.json(procesos)
    }
  } catch (error) {
    console.error("Error fetching procesos:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

// POST - Crear proceso (solo admin)
export async function POST(request: Request) {
  try {
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
    const clienteId = formData.get("clienteId") as string
    const caso = formData.get("caso") as string
    const estado = formData.get("estado") as string
    const nota = formData.get("nota") as string
    const file = formData.get("file") as File | null

    if (!clienteId || !caso) {
      return NextResponse.json({ error: "Cliente y caso son requeridos" }, { status: 400 })
    }

    let storagePath: string | null = null
    let nombreArchivo: string | null = null
    let tamano: string | null = null
    let mimeType: string | null = null

    // Subir archivo si existe
    if (file && file.size > 0) {
      const fileName = `${clienteId}/${Date.now()}-${file.name}`
      const { error: uploadError } = await supabase.storage
        .from("documentos")
        .upload(fileName, file, { contentType: file.type })

      if (uploadError) {
        console.error("Error uploading file:", uploadError)
        return NextResponse.json({ error: "Error al subir archivo" }, { status: 500 })
      }

      storagePath = fileName
      nombreArchivo = file.name
      tamano = file.size.toString()
      mimeType = file.type
    }

    const db = getDb()
    const [newProceso] = await db
      .insert(schema.procesosJuridicos)
      .values({
        clienteId,
        caso,
        estado: estado || "pendiente",
        nota,
        storagePath,
        nombreArchivo,
        tamano,
        mimeType,
        subidoPor: user.id,
      })
      .returning()

    return NextResponse.json(newProceso, { status: 201 })
  } catch (error) {
    console.error("Error creating proceso:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
