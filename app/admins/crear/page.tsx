"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ShieldCheck, ArrowLeft, Loader2, Check, Copy, Eye, EyeOff } from "lucide-react"
import Link from "next/link"

export default function CrearAdminPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const [createdAdmin, setCreatedAdmin] = useState<{
    nombre: string
    correo: string
    password: string
  } | null>(null)
  const [copied, setCopied] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const [formData, setFormData] = useState({
    nombre: "",
    correo: "",
    usuario: "",
    password: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Error al crear administrador")
      }

      setCreatedAdmin({
        nombre: data.nombre,
        correo: data.correo,
        password: data.passwordGenerated,
      })
      setShowSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopyCredentials = () => {
    if (createdAdmin) {
      const text = `Correo: ${createdAdmin.correo}\nContraseña: ${createdAdmin.password}`
      navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleCloseSuccess = () => {
    setShowSuccess(false)
    router.push("/admins")
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-6">
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/admins">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a administradores
          </Link>
        </Button>
      </div>

      <Card className="border-border">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent/10">
              <ShieldCheck className="h-6 w-6 text-accent" />
            </div>
            <div>
              <CardTitle className="text-primary">Crear Administrador</CardTitle>
              <CardDescription>Los administradores pueden crear y gestionar clientes</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre completo *</Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="Ej: María García"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="correo">Correo electrónico *</Label>
                <Input
                  id="correo"
                  type="email"
                  value={formData.correo}
                  onChange={(e) => setFormData({ ...formData, correo: e.target.value })}
                  placeholder="admin@ejemplo.com"
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="usuario">Usuario *</Label>
                <Input
                  id="usuario"
                  value={formData.usuario}
                  onChange={(e) => setFormData({ ...formData, usuario: e.target.value })}
                  placeholder="Ej: mgarcia"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Dejar vacío para generar"
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Si se deja vacío, se generará una contraseña automáticamente
                </p>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" asChild>
                <Link href="/admins">Cancelar</Link>
              </Button>
              <Button type="submit" disabled={isLoading} className="bg-primary hover:bg-primary-light">
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creando...
                  </>
                ) : (
                  "Crear administrador"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Modal de éxito con credenciales */}
      <Dialog open={showSuccess} onOpenChange={handleCloseSuccess}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-primary flex items-center gap-2">
              <Check className="h-5 w-5 text-green-500" />
              Administrador Creado
            </DialogTitle>
            <DialogDescription>
              El administrador <strong>{createdAdmin?.nombre}</strong> ha sido creado exitosamente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 bg-secondary rounded-lg space-y-2">
              <div>
                <p className="text-xs text-muted-foreground">Correo</p>
                <p className="font-mono text-sm">{createdAdmin?.correo}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Contraseña</p>
                <p className="font-mono text-sm">{createdAdmin?.password}</p>
              </div>
            </div>
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <p className="text-xs text-amber-700">
                Guarda estas credenciales. Puedes ver la contraseña luego desde la lista de administradores.
              </p>
            </div>
            <Button onClick={handleCopyCredentials} className="w-full bg-transparent" variant="outline">
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Copiado
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar credenciales
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
