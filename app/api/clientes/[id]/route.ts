import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getAdminClient } from "@/lib/supabase/admin"
import { getDb, schema } from "@/lib/db"
import { eq } from "drizzle-orm"

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

    if (profile?.role !== "super_admin" && profile?.role !== "admin") {
      return NextResponse.json({ error: "No tienes permisos" }, { status: 403 })
    }

    const db = getDb()

    // Obtener el cliente
    const [cliente] = await db.select().from(schema.clientes).where(eq(schema.clientes.id, id))

    if (!cliente) {
      return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 })
    }

    // Verificar que admin solo pueda eliminar sus clientes
    if (profile?.role === "admin" && cliente.creadoPor !== user.id) {
      return NextResponse.json({ error: "No tienes permisos para eliminar este cliente" }, { status: 403 })
    }

    // Eliminar archivos del storage
    const adminClient = getAdminClient()

    // Obtener documentos para eliminar del storage
    const documentos = await db.select().from(schema.documentos).where(eq(schema.documentos.clienteId, id))

    for (const doc of documentos) {
      if (doc.storagePath) {
        await adminClient.storage.from("documentos").remove([doc.storagePath])
      }
    }

    // Obtener procesos para eliminar del storage
    const procesos = await db.select().from(schema.procesosJuridicos).where(eq(schema.procesosJuridicos.clienteId, id))

    for (const proceso of procesos) {
      if (proceso.storagePath) {
        await adminClient.storage.from("documentos").remove([proceso.storagePath])
      }
    }

    // Eliminar el usuario de Supabase Auth si existe
    if (cliente.authUserId) {
      await adminClient.auth.admin.deleteUser(cliente.authUserId)
    }

    // Eliminar cliente (documentos y procesos se eliminan en cascada)
    await db.delete(schema.clientes).where(eq(schema.clientes.id, id))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting cliente:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
