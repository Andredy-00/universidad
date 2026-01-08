import { pgTable, pgEnum, uuid, text, timestamp, boolean, integer, index } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"

// ============================================
// ENUMS - Valores controlados para campos críticos
// ============================================

export const userRoleEnum = pgEnum("user_role", ["super_admin", "admin", "cliente"])

export const procesoEstadoEnum = pgEnum("proceso_estado", [
  "pendiente",
  "en_proceso",
  "en_revision",
  "resuelto",
  "archivado",
  "cancelado",
])

export const documentoTipoEnum = pgEnum("documento_tipo", [
  "demanda",
  "contestacion",
  "sentencia",
  "recurso",
  "contrato",
  "poder",
  "escritura",
  "certificado",
  "otro",
])

// ============================================
// PROFILES - Única tabla de usuarios (vinculada a auth.users)
// ============================================

// Eliminamos tablas separadas de admins/clientes, todo es un profile con rol
export const profiles = pgTable(
  "profiles",
  {
    // UUID viene de auth.users
    id: uuid("id").primaryKey(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),

    // Datos básicos del usuario
    email: text("email").notNull().unique(),
    displayName: text("display_name").notNull(),
    celular: text("celular"),

    role: userRoleEnum("role").default("cliente").notNull(),

    creadoPorId: uuid("creado_por_id"),

    // Estado del usuario
    activo: boolean("activo").default(true).notNull(),

    // Metadata adicional para clientes
    numeroIdentificacion: text("numero_identificacion"),
    direccion: text("direccion"),
    notas: text("notas"),
  },
  (table) => [
    index("profiles_role_idx").on(table.role),
    index("profiles_creado_por_idx").on(table.creadoPorId),
    index("profiles_email_idx").on(table.email),
  ],
)

// ============================================
// PROCESOS JURÍDICOS - Casos legales
// ============================================

export const procesosJuridicos = pgTable(
  "procesos_juridicos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),

    clienteId: uuid("cliente_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),

    // Datos del proceso
    numeroProceso: text("numero_proceso"), // Número de radicado oficial
    caso: text("caso").notNull(),
    descripcion: text("descripcion"),

    estado: procesoEstadoEnum("estado").default("pendiente").notNull(),

    // Fechas importantes del proceso
    fechaInicio: timestamp("fecha_inicio", { withTimezone: true }),
    fechaAudiencia: timestamp("fecha_audiencia", { withTimezone: true }),
    fechaCierre: timestamp("fecha_cierre", { withTimezone: true }),

    // Juzgado/Entidad
    juzgado: text("juzgado"),
    ciudad: text("ciudad"),

    // Notas internas (solo visible para admins)
    notasInternas: text("notas_internas"),

    // Quién gestiona este proceso
    abogadoId: uuid("abogado_id").references(() => profiles.id),

    // Auditoría
    creadoPorId: uuid("creado_por_id")
      .notNull()
      .references(() => profiles.id),
  },
  (table) => [
    index("procesos_cliente_idx").on(table.clienteId),
    index("procesos_estado_idx").on(table.estado),
    index("procesos_abogado_idx").on(table.abogadoId),
    index("procesos_numero_idx").on(table.numeroProceso),
  ],
)

// ============================================
// DOCUMENTOS - Archivos adjuntos a procesos
// ============================================

export const documentos = pgTable(
  "documentos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),

    procesoId: uuid("proceso_id")
      .notNull()
      .references(() => procesosJuridicos.id, { onDelete: "cascade" }),

    // Metadata del documento
    nombre: text("nombre").notNull(),
    descripcion: text("descripcion"),

    tipo: documentoTipoEnum("tipo").default("otro").notNull(),

    // Información del archivo
    storagePath: text("storage_path").notNull(),
    nombreArchivo: text("nombre_archivo").notNull(),
    tamanoBytes: integer("tamano_bytes"),
    mimeType: text("mime_type"),

    version: integer("version").default(1).notNull(),
    esVersionActual: boolean("es_version_actual").default(true).notNull(),

    // Visibilidad
    visibleParaCliente: boolean("visible_para_cliente").default(true).notNull(),

    // Auditoría
    subidoPorId: uuid("subido_por_id")
      .notNull()
      .references(() => profiles.id),
  },
  (table) => [
    index("documentos_proceso_idx").on(table.procesoId),
    index("documentos_tipo_idx").on(table.tipo),
    index("documentos_version_actual_idx").on(table.esVersionActual),
  ],
)

// ============================================
// HISTORIAL DE ACTIVIDAD - Auditoría completa
// ============================================

export const actividadHistorial = pgTable(
  "actividad_historial",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),

    // Qué tipo de entidad fue afectada
    entidadTipo: text("entidad_tipo").notNull(), // 'proceso', 'documento', 'profile'
    entidadId: uuid("entidad_id").notNull(),

    // Qué acción se realizó
    accion: text("accion").notNull(), // 'crear', 'actualizar', 'eliminar', 'descargar'

    // Descripción legible de la acción
    descripcion: text("descripcion").notNull(),

    // Datos antes/después (JSON para auditoría completa)
    datosAnteriores: text("datos_anteriores"), // JSON stringified
    datosNuevos: text("datos_nuevos"), // JSON stringified

    // Quién realizó la acción
    usuarioId: uuid("usuario_id")
      .notNull()
      .references(() => profiles.id),

    // IP y metadata de la request
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
  },
  (table) => [
    index("actividad_entidad_idx").on(table.entidadTipo, table.entidadId),
    index("actividad_usuario_idx").on(table.usuarioId),
    index("actividad_fecha_idx").on(table.createdAt),
  ],
)

// ============================================
// NOTIFICACIONES - Sistema de alertas
// ============================================

export const notificaciones = pgTable(
  "notificaciones",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),

    // A quién va dirigida
    usuarioId: uuid("usuario_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),

    // Contenido
    titulo: text("titulo").notNull(),
    mensaje: text("mensaje").notNull(),

    // Referencia opcional a entidad relacionada
    entidadTipo: text("entidad_tipo"),
    entidadId: uuid("entidad_id"),

    // Estado
    leida: boolean("leida").default(false).notNull(),
    leidaAt: timestamp("leida_at", { withTimezone: true }),
  },
  (table) => [
    index("notificaciones_usuario_idx").on(table.usuarioId),
    index("notificaciones_leida_idx").on(table.leida),
  ],
)

// ============================================
// RELATIONS - Definiciones de relaciones para queries
// ============================================

export const profilesRelations = relations(profiles, ({ one, many }) => ({
  creadoPor: one(profiles, {
    fields: [profiles.creadoPorId],
    references: [profiles.id],
    relationName: "usuarioCreador",
  }),
  usuariosCreados: many(profiles, { relationName: "usuarioCreador" }),
  procesos: many(procesosJuridicos, { relationName: "clienteProcesos" }),
  procesosComoAbogado: many(procesosJuridicos, { relationName: "abogadoProcesos" }),
  documentosSubidos: many(documentos),
  notificaciones: many(notificaciones),
  actividades: many(actividadHistorial),
}))

export const procesosJuridicosRelations = relations(procesosJuridicos, ({ one, many }) => ({
  cliente: one(profiles, {
    fields: [procesosJuridicos.clienteId],
    references: [profiles.id],
    relationName: "clienteProcesos",
  }),
  abogado: one(profiles, {
    fields: [procesosJuridicos.abogadoId],
    references: [profiles.id],
    relationName: "abogadoProcesos",
  }),
  creadoPor: one(profiles, {
    fields: [procesosJuridicos.creadoPorId],
    references: [profiles.id],
  }),
  documentos: many(documentos),
}))

export const documentosRelations = relations(documentos, ({ one }) => ({
  proceso: one(procesosJuridicos, {
    fields: [documentos.procesoId],
    references: [procesosJuridicos.id],
  }),
  subidoPor: one(profiles, {
    fields: [documentos.subidoPorId],
    references: [profiles.id],
  }),
}))

export const notificacionesRelations = relations(notificaciones, ({ one }) => ({
  usuario: one(profiles, {
    fields: [notificaciones.usuarioId],
    references: [profiles.id],
  }),
}))

export const actividadHistorialRelations = relations(actividadHistorial, ({ one }) => ({
  usuario: one(profiles, {
    fields: [actividadHistorial.usuarioId],
    references: [profiles.id],
  }),
}))

// ============================================
// TIPOS INFERIDOS
// ============================================

export type Profile = typeof profiles.$inferSelect
export type NewProfile = typeof profiles.$inferInsert

export type ProcesoJuridico = typeof procesosJuridicos.$inferSelect
export type NewProcesoJuridico = typeof procesosJuridicos.$inferInsert

export type Documento = typeof documentos.$inferSelect
export type NewDocumento = typeof documentos.$inferInsert

export type ActividadHistorial = typeof actividadHistorial.$inferSelect
export type NewActividadHistorial = typeof actividadHistorial.$inferInsert

export type Notificacion = typeof notificaciones.$inferSelect
export type NewNotificacion = typeof notificaciones.$inferInsert

// Tipos para enums
export type UserRole = (typeof userRoleEnum.enumValues)[number]
export type ProcesoEstado = (typeof procesoEstadoEnum.enumValues)[number]
export type DocumentoTipo = (typeof documentoTipoEnum.enumValues)[number]
