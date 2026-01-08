import { db } from "./index"
import {
  profiles,
  procesosJuridicos,
  documentos,
  actividadHistorial,
  notificaciones,
  type UserRole,
  type ProcesoEstado,
  type DocumentoTipo,
} from "./schema"
import { eq, and, desc } from "drizzle-orm"

// ============================================
// HELPERS PARA PROFILES
// ============================================

export async function getProfileById(id: string) {
  const result = await db.select().from(profiles).where(eq(profiles.id, id)).limit(1)
  return result[0] || null
}

export async function getProfileByEmail(email: string) {
  const result = await db.select().from(profiles).where(eq(profiles.email, email)).limit(1)
  return result[0] || null
}

export async function getClientesByCreador(creadorId: string) {
  return db
    .select()
    .from(profiles)
    .where(and(eq(profiles.creadoPorId, creadorId), eq(profiles.role, "cliente")))
    .orderBy(desc(profiles.createdAt))
}

export async function getAdminsByCreador(creadorId: string) {
  return db
    .select()
    .from(profiles)
    .where(and(eq(profiles.creadoPorId, creadorId), eq(profiles.role, "admin")))
    .orderBy(desc(profiles.createdAt))
}

export async function getAllClientes() {
  return db.select().from(profiles).where(eq(profiles.role, "cliente")).orderBy(desc(profiles.createdAt))
}

export async function getAllAdmins() {
  return db.select().from(profiles).where(eq(profiles.role, "admin")).orderBy(desc(profiles.createdAt))
}

// ============================================
// HELPERS PARA PROCESOS
// ============================================

export async function getProcesosByCliente(clienteId: string) {
  return db
    .select()
    .from(procesosJuridicos)
    .where(eq(procesosJuridicos.clienteId, clienteId))
    .orderBy(desc(procesosJuridicos.createdAt))
}

export async function getProcesosByAbogado(abogadoId: string) {
  return db
    .select()
    .from(procesosJuridicos)
    .where(eq(procesosJuridicos.abogadoId, abogadoId))
    .orderBy(desc(procesosJuridicos.createdAt))
}

export async function getProcesosWithCliente(creadorId?: string) {
  const query = db
    .select({
      proceso: procesosJuridicos,
      cliente: {
        id: profiles.id,
        displayName: profiles.displayName,
        email: profiles.email,
      },
    })
    .from(procesosJuridicos)
    .leftJoin(profiles, eq(procesosJuridicos.clienteId, profiles.id))
    .orderBy(desc(procesosJuridicos.createdAt))

  if (creadorId) {
    return query.where(eq(procesosJuridicos.creadoPorId, creadorId))
  }

  return query
}

// ============================================
// HELPERS PARA DOCUMENTOS
// ============================================

export async function getDocumentosByProceso(procesoId: string) {
  return db
    .select()
    .from(documentos)
    .where(and(eq(documentos.procesoId, procesoId), eq(documentos.esVersionActual, true)))
    .orderBy(desc(documentos.createdAt))
}

export async function getDocumentosVisiblesParaCliente(procesoId: string) {
  return db
    .select()
    .from(documentos)
    .where(
      and(
        eq(documentos.procesoId, procesoId),
        eq(documentos.esVersionActual, true),
        eq(documentos.visibleParaCliente, true),
      ),
    )
    .orderBy(desc(documentos.createdAt))
}

// ============================================
// HELPERS PARA ACTIVIDAD
// ============================================

export async function registrarActividad(data: {
  entidadTipo: string
  entidadId: string
  accion: string
  descripcion: string
  usuarioId: string
  datosAnteriores?: object
  datosNuevos?: object
  ipAddress?: string
  userAgent?: string
}) {
  return db.insert(actividadHistorial).values({
    entidadTipo: data.entidadTipo,
    entidadId: data.entidadId,
    accion: data.accion,
    descripcion: data.descripcion,
    usuarioId: data.usuarioId,
    datosAnteriores: data.datosAnteriores ? JSON.stringify(data.datosAnteriores) : null,
    datosNuevos: data.datosNuevos ? JSON.stringify(data.datosNuevos) : null,
    ipAddress: data.ipAddress,
    userAgent: data.userAgent,
  })
}

export async function getActividadReciente(limit = 50) {
  return db
    .select({
      actividad: actividadHistorial,
      usuario: {
        id: profiles.id,
        displayName: profiles.displayName,
        email: profiles.email,
      },
    })
    .from(actividadHistorial)
    .leftJoin(profiles, eq(actividadHistorial.usuarioId, profiles.id))
    .orderBy(desc(actividadHistorial.createdAt))
    .limit(limit)
}

// ============================================
// HELPERS PARA NOTIFICACIONES
// ============================================

export async function crearNotificacion(data: {
  usuarioId: string
  titulo: string
  mensaje: string
  entidadTipo?: string
  entidadId?: string
}) {
  return db.insert(notificaciones).values(data)
}

export async function getNotificacionesPendientes(usuarioId: string) {
  return db
    .select()
    .from(notificaciones)
    .where(and(eq(notificaciones.usuarioId, usuarioId), eq(notificaciones.leida, false)))
    .orderBy(desc(notificaciones.createdAt))
}

export async function marcarNotificacionLeida(notificacionId: string) {
  return db
    .update(notificaciones)
    .set({
      leida: true,
      leidaAt: new Date(),
    })
    .where(eq(notificaciones.id, notificacionId))
}

// ============================================
// CONSTANTES PARA UI
// ============================================

export const ROLES_LABELS: Record<UserRole, string> = {
  super_admin: "Super Administrador",
  admin: "Administrador",
  cliente: "Cliente",
}

export const PROCESO_ESTADOS_LABELS: Record<ProcesoEstado, string> = {
  pendiente: "Pendiente",
  en_proceso: "En Proceso",
  en_revision: "En Revisión",
  resuelto: "Resuelto",
  archivado: "Archivado",
  cancelado: "Cancelado",
}

export const PROCESO_ESTADOS_COLORS: Record<ProcesoEstado, string> = {
  pendiente: "bg-yellow-100 text-yellow-800",
  en_proceso: "bg-blue-100 text-blue-800",
  en_revision: "bg-purple-100 text-purple-800",
  resuelto: "bg-green-100 text-green-800",
  archivado: "bg-gray-100 text-gray-800",
  cancelado: "bg-red-100 text-red-800",
}

export const DOCUMENTO_TIPOS_LABELS: Record<DocumentoTipo, string> = {
  demanda: "Demanda",
  contestacion: "Contestación",
  sentencia: "Sentencia",
  recurso: "Recurso",
  contrato: "Contrato",
  poder: "Poder",
  escritura: "Escritura",
  certificado: "Certificado",
  otro: "Otro",
}
