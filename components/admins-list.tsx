"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { ShieldCheck, Search, UserPlus, Loader2, Eye, Copy, Check, Trash2, AlertTriangle } from "lucide-react"
import type { Admin } from "@/lib/db/schema"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"

export function AdminsList() {
  const [searchTerm, setSearchTerm] = useState("")
  const [admins, setAdmins] = useState<Admin[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null)
  const [password, setPassword] = useState<string | null>(null)
  const [loadingPassword, setLoadingPassword] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [adminToDelete, setAdminToDelete] = useState<Admin | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    fetchAdmins()
  }, [])

  async function fetchAdmins() {
    try {
      const response = await fetch("/api/admins")
      if (!response.ok) {
        throw new Error("Error al cargar administradores")
      }
      const data = await response.json()
      setAdmins(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setIsLoading(false)
    }
  }

  const handleShowPassword = async (admin: Admin) => {
    setSelectedAdmin(admin)
    setShowPasswordModal(true)
    setPassword(null)
    setLoadingPassword(true)
    setCopied(false)

    try {
      const response = await fetch(`/api/admins/${admin.id}/password`)
      if (!response.ok) {
        throw new Error("Error al obtener contraseña")
      }
      const data = await response.json()
      setPassword(data.password)
    } catch (err) {
      setPassword(null)
    } finally {
      setLoadingPassword(false)
    }
  }

  const handleCopyPassword = () => {
    if (password) {
      navigator.clipboard.writeText(password)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleCloseModal = () => {
    setShowPasswordModal(false)
    setPassword(null)
    setSelectedAdmin(null)
  }

  const handleDeleteClick = (admin: Admin) => {
    setAdminToDelete(admin)
    setShowDeleteModal(true)
  }

  const handleConfirmDelete = async () => {
    if (!adminToDelete) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/admins/${adminToDelete.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Error al eliminar administrador")
      }

      setAdmins(admins.filter((a) => a.id !== adminToDelete.id))
      setShowDeleteModal(false)
      setAdminToDelete(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar")
    } finally {
      setIsDeleting(false)
    }
  }

  const handleCancelDelete = () => {
    setShowDeleteModal(false)
    setAdminToDelete(null)
  }

  const filteredAdmins = admins.filter((admin) => admin.nombre.toLowerCase().includes(searchTerm.toLowerCase()))

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent/10">
              <ShieldCheck className="h-6 w-6 text-accent" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-primary">Administradores</h1>
              <p className="text-muted-foreground">Gestiona los administradores del sistema</p>
            </div>
          </div>
          <Button asChild className="bg-primary hover:bg-primary-light text-primary-foreground">
            <Link href="/admins/crear">
              <UserPlus className="h-4 w-4 mr-2" />
              Crear admin
            </Link>
          </Button>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {error && <div className="text-center py-8 text-destructive">{error}</div>}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredAdmins.length === 0 && !error ? (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            {searchTerm ? "No se encontraron administradores con ese nombre" : "No hay administradores registrados"}
          </div>
        ) : (
          filteredAdmins.map((admin) => (
            <Card key={admin.id} className="border-border hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-primary text-lg">{admin.nombre}</h3>
                      <span className="text-xs px-2 py-0.5 rounded bg-accent/10 text-accent">Admin</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{admin.correo}</p>
                    <p className="text-xs text-muted-foreground/70">@{admin.usuario}</p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleShowPassword(admin)}
                      className="h-8 w-8 text-muted-foreground hover:text-accent"
                      title="Ver contraseña"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteClick(admin)}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      title="Eliminar admin"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Modal de contraseña */}
      <Dialog open={showPasswordModal} onOpenChange={handleCloseModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-primary">Contraseña del Administrador</DialogTitle>
            <DialogDescription>
              {selectedAdmin?.nombre} - {selectedAdmin?.correo}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {loadingPassword ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : password ? (
              <>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Contraseña</Label>
                  <div className="p-3 bg-secondary rounded-lg font-mono text-sm select-all">{password}</div>
                </div>
                <Button onClick={handleCopyPassword} className="w-full bg-transparent" variant="outline">
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Copiado
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Copiar contraseña
                    </>
                  )}
                </Button>
              </>
            ) : (
              <div className="text-center py-4 text-muted-foreground">No se pudo obtener la contraseña</div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de confirmación de eliminación */}
      <Dialog open={showDeleteModal} onOpenChange={handleCancelDelete}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Eliminar Administrador
            </DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar a <strong>{adminToDelete?.nombre}</strong>?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20">
              <p className="text-sm text-destructive font-medium">
                Esta acción eliminará permanentemente la cuenta del administrador.
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleCancelDelete} disabled={isDeleting}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete} disabled={isDeleting}>
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Eliminando...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
