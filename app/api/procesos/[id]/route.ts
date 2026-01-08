import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getDb, schema } from "@/lib/db"
import { eq } from "drizzle-orm"

// PUT - Actualizar proceso (solo admin)
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
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

    const formData = await request.formData()
    const caso = formData.get("caso") as string
    const estado = formData.get("estado") as string
    const nota = formData.get("nota") as string
    const file = formData.get("file") as File | null

    const db = getDb()

    // Obtener proceso actual
    const [currentProceso] = await db.select().from(schema.procesosJuridicos).where(eq(schema.procesosJuridicos.id, id))

    if (!currentProceso) {
      return NextResponse.json({ error: "Proceso no encontrado" }, { status: 404 })
    }

    let storagePath = currentProceso.storagePath
    let nombreArchivo = currentProceso.nombreArchivo
    let tamano = currentProceso.tamano
    let mimeType = currentProceso.mimeType

    // Subir nuevo archivo si existe
    if (file && file.size > 0) {
      // Eliminar archivo anterior si existe
      if (currentProceso.storagePath) {
        await supabase.storage.from("documentos").remove([currentProceso.storagePath])
      }

      const fileName = `${currentProceso.clienteId}/${Date.now()}-${file.name}`
      const { error: uploadError } = await supabase.storage
        .from("documentos")
        .upload(fileName, file, { contentType: file.type })

      if (uploadError) {
        return NextResponse.json({ error: "Error al subir archivo" }, { status: 500 })
      }

      storagePath = fileName
      nombreArchivo = file.name
      tamano = file.size.toString()
      mimeType = file.type
    }

    const [updatedProceso] = await db
      .update(schema.procesosJuridicos)
      .set({
        caso,
        estado,
        nota,
        storagePath,
        nombreArchivo,
        tamano,
        mimeType,
        updatedAt: new Date(),
      })
      .where(eq(schema.procesosJuridicos.id, id))
      .returning()

    return NextResponse.json(updatedProceso)
  } catch (error) {
    console.error("Error updating proceso:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

// DELETE - Eliminar proceso (solo admin)
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

    // Obtener proceso para eliminar archivo
    const [proceso] = await db.select().from(schema.procesosJuridicos).where(eq(schema.procesosJuridicos.id, id))

    if (proceso?.storagePath) {
      await supabase.storage.from("documentos").remove([proceso.storagePath])
    }

    await db.delete(schema.procesosJuridicos).where(eq(schema.procesosJuridicos.id, id))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting proceso:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
