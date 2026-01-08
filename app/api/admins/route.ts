import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getAdminClient } from "@/lib/supabase/admin"
import { getDb, schema } from "@/lib/db"
import { encryptPassword, generatePassword } from "@/lib/crypto"

// GET - Obtener todos los admins (solo super_admin)
export async function GET() {
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

    const db = getDb()
    const admins = await db
      .select({
        id: schema.admins.id,
        createdAt: schema.admins.createdAt,
        updatedAt: schema.admins.updatedAt,
        nombre: schema.admins.nombre,
        correo: schema.admins.correo,
        usuario: schema.admins.usuario,
        authUserId: schema.admins.authUserId,
        activo: schema.admins.activo,
        creadoPor: schema.admins.creadoPor,
      })
      .from(schema.admins)

    return NextResponse.json(admins)
  } catch (error) {
    console.error("Error fetching admins:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

// POST - Crear nuevo admin (solo super_admin)
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

    const body = await request.json()
    const { nombre, correo, usuario, password: customPassword } = body

    if (!nombre || !correo || !usuario) {
      return NextResponse.json({ error: "Nombre, correo y usuario son requeridos" }, { status: 400 })
    }

    const password = customPassword || generatePassword(10)
    const passwordEncrypted = encryptPassword(password)

    const adminClient = getAdminClient()
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: correo,
      password: password,
      email_confirm: true,
      user_metadata: {
        display_name: nombre,
        role: "admin",
      },
    })

    if (authError) {
      console.error("Error creating auth user:", authError)
      return NextResponse.json(
        { error: "Error al crear usuario de autenticación: " + authError.message },
        { status: 400 },
      )
    }

    // Crear perfil con rol admin
    await adminClient.from("profiles").upsert({
      id: authData.user?.id,
      email: correo,
      display_name: nombre,
      role: "admin",
      creado_por: user.id,
    })

    const db = getDb()
    const [newAdmin] = await db
      .insert(schema.admins)
      .values({
        nombre,
        correo,
        usuario,
        passwordEncrypted,
        authUserId: authData.user?.id,
        creadoPor: user.id,
      })
      .returning()

    return NextResponse.json(
      {
        ...newAdmin,
        passwordGenerated: password,
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Error creating admin:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
