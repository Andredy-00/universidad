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
  passwordEncrypted: text("password_encrypted"),
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
  storagePath: text("storage_path").notNull(),
  nombreArchivo: text("nombre_archivo").notNull(),
  tamano: text("tamano"),
  mimeType: text("mime_type"),
  subidoPor: uuid("subido_por").references(() => profiles.id),
})

export const procesosJuridicos = pgTable("procesos_juridicos", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  clienteId: uuid("cliente_id")
    .notNull()
    .references(() => clientes.id, { onDelete: "cascade" }),
  caso: text("caso").notNull(),
  estado: text("estado").default("pendiente"),
  nota: text("nota"),
  storagePath: text("storage_path"),
  nombreArchivo: text("nombre_archivo"),
  tamano: text("tamano"),
  mimeType: text("mime_type"),
  subidoPor: uuid("subido_por").references(() => profiles.id),
})

// Tipos inferidos
export type Profile = typeof profiles.$inferSelect
export type NewProfile = typeof profiles.$inferInsert

export type Cliente = typeof clientes.$inferSelect
export type NewCliente = typeof clientes.$inferInsert

export type Documento = typeof documentos.$inferSelect
export type NewDocumento = typeof documentos.$inferInsert

export type ProcesoJuridico = typeof procesosJuridicos.$inferSelect
export type NewProcesoJuridico = typeof procesosJuridicos.$inferInsert
