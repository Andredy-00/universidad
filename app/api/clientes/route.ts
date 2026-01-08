import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getDb, schema } from "@/lib/db"
import { eq } from "drizzle-orm"
import { encryptPassword, generatePassword } from "@/lib/crypto"

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
      // Admin ve todos los clientes (sin contraseña)
      const clientes = await db
        .select({
          id: schema.clientes.id,
          createdAt: schema.clientes.createdAt,
          updatedAt: schema.clientes.updatedAt,
          nombre: schema.clientes.nombre,
          correo: schema.clientes.correo,
          celular: schema.clientes.celular,
          usuario: schema.clientes.usuario,
          authUserId: schema.clientes.authUserId,
          activo: schema.clientes.activo,
        })
        .from(schema.clientes)
      return NextResponse.json(clientes)
    } else {
      // Usuario normal solo ve su cliente
      const clientes = await db
        .select({
          id: schema.clientes.id,
          createdAt: schema.clientes.createdAt,
          updatedAt: schema.clientes.updatedAt,
          nombre: schema.clientes.nombre,
          correo: schema.clientes.correo,
          celular: schema.clientes.celular,
          usuario: schema.clientes.usuario,
          authUserId: schema.clientes.authUserId,
          activo: schema.clientes.activo,
        })
        .from(schema.clientes)
        .where(eq(schema.clientes.authUserId, user.id))
      return NextResponse.json(clientes)
    }
  } catch (error) {
    console.error("Error fetching clientes:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

// POST - Crear nuevo cliente con cuenta de usuario (solo admin)
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
    const { nombre, correo, celular, usuario, password: customPassword } = body

    if (!nombre || !correo || !usuario) {
      return NextResponse.json({ error: "Nombre, correo y usuario son requeridos" }, { status: 400 })
    }

    const password = customPassword || generatePassword(10)
    const passwordEncrypted = encryptPassword(password)

    // Crear usuario en Supabase Auth usando service role
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: correo,
      password: password,
      email_confirm: true, // Auto-confirmar email
      user_metadata: {
        display_name: nombre,
        role: "user",
      },
    })

    if (authError) {
      console.error("Error creating auth user:", authError)
      return NextResponse.json(
        { error: "Error al crear usuario de autenticación: " + authError.message },
        { status: 400 },
      )
    }

    const db = getDb()
    const [newCliente] = await db
      .insert(schema.clientes)
      .values({
        nombre,
        correo,
        celular,
        usuario,
        passwordEncrypted,
        authUserId: authData.user?.id,
      })
      .returning()

    // Retornar cliente con contraseña solo en la creación
    return NextResponse.json(
      {
        ...newCliente,
        passwordGenerated: password,
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Error creating cliente:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
