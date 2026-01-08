import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getDb, schema } from "@/lib/db"
import { eq } from "drizzle-orm"

// GET - Obtener todos los clientes
export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Verificar rol del usuario
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

    const db = getDb()

    if (profile?.role === "super_admin") {
      // Admin ve todos los clientes
      const clientes = await db.select().from(schema.clientes)
      return NextResponse.json(clientes)
    } else {
      // Usuario normal solo ve su cliente
      const clientes = await db.select().from(schema.clientes).where(eq(schema.clientes.authUserId, user.id))
      return NextResponse.json(clientes)
    }
  } catch (error) {
    console.error("Error fetching clientes:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

// POST - Crear nuevo cliente (solo admin)
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Verificar rol del usuario
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

    if (profile?.role !== "super_admin") {
      return NextResponse.json({ error: "No tienes permisos" }, { status: 403 })
    }

    const body = await request.json()
    const { nombre, correo, celular, usuario } = body

    if (!nombre || !correo || !usuario) {
      return NextResponse.json({ error: "Nombre, correo y usuario son requeridos" }, { status: 400 })
    }

    const db = getDb()
    const [newCliente] = await db
      .insert(schema.clientes)
      .values({
        nombre,
        correo,
        celular,
        usuario,
      })
      .returning()

    return NextResponse.json(newCliente, { status: 201 })
  } catch (error) {
    console.error("Error creating cliente:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
