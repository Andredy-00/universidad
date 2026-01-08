import { pgTable, uuid, text, timestamp, boolean } from "drizzle-orm/pg-core"

// Tabla de perfiles (ya existe en Supabase)
export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  email: text("email"),
  displayName: text("display_name"),
  role: text("role").default("user"),
})

// Tabla de clientes
export const clientes = pgTable("clientes", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  nombre: text("nombre").notNull(),
  correo: text("correo").notNull().unique(),
  celular: text("celular"),
  usuario: text("usuario").notNull().unique(),
  // Referencia al usuario de Supabase Auth si tiene cuenta
  authUserId: uuid("auth_user_id").references(() => profiles.id),
  activo: boolean("activo").default(true),
})

// Tabla de documentos/PDFs
export const documentos = pgTable("documentos", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  clienteId: uuid("cliente_id")
    .notNull()
    .references(() => clientes.id, { onDelete: "cascade" }),
  nombre: text("nombre").notNull(),
  descripcion: text("descripcion"),
  // Ruta del archivo en Supabase Storage
  storagePath: text("storage_path").notNull(),
  // Nombre original del archivo
  nombreArchivo: text("nombre_archivo").notNull(),
  // Tamaño en bytes
  tamano: text("tamano"),
  // Tipo MIME
  mimeType: text("mime_type"),
  // Subido por (ID del admin que lo subió)
  subidoPor: uuid("subido_por").references(() => profiles.id),
})

// Tipos inferidos
export type Profile = typeof profiles.$inferSelect
export type NewProfile = typeof profiles.$inferInsert

export type Cliente = typeof clientes.$inferSelect
export type NewCliente = typeof clientes.$inferInsert

export type Documento = typeof documentos.$inferSelect
export type NewDocumento = typeof documentos.$inferInsert
