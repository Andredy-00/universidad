"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { UserPlus, ArrowLeft, AlertCircle, Copy, Check, Eye, EyeOff } from "lucide-react"
import Link from "next/link"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

export default function CrearClientePage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [createdClient, setCreatedClient] = useState<{ correo: string; password: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const [formData, setFormData] = useState({
    correo: "",
    nombre: "",
    celular: "",
    usuario: "",
    password: "",
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/clientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Error al crear cliente")
      }

      // Mostrar modal con credenciales
      setCreatedClient({
        correo: data.correo,
        password: data.passwordGenerated,
      })
      setShowSuccessModal(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear cliente")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopyCredentials = () => {
    if (createdClient) {
      navigator.clipboard.writeText(`Correo: ${createdClient.correo}\nContraseña: ${createdClient.password}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleCloseModal = () => {
    setShowSuccessModal(false)
    setCreatedClient(null)
    router.push("/clientes")
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Button variant="ghost" asChild className="mb-4 text-muted-foreground hover:text-primary">
          <Link href="/clientes">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a clientes
          </Link>
        </Button>
      </div>

      <div className="max-w-lg mx-auto">
        <Card className="shadow-lg border-border">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-3 rounded-full bg-accent/10 w-fit">
              <UserPlus className="h-8 w-8 text-accent" />
            </div>
            <CardTitle className="text-2xl font-bold text-primary">Crear Cliente</CardTitle>
            <CardDescription className="text-muted-foreground">
              Ingresa los datos para registrar un nuevo cliente con acceso al sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="correo">Correo electrónico</Label>
                <Input
                  id="correo"
                  name="correo"
                  type="email"
                  placeholder="cliente@email.com"
                  value={formData.correo}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre completo</Label>
                <Input
                  id="nombre"
                  name="nombre"
                  type="text"
                  placeholder="Nombre del cliente"
                  value={formData.nombre}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="celular">Celular</Label>
                <Input
                  id="celular"
                  name="celular"
                  type="tel"
                  placeholder="+57 300 000 0000"
                  value={formData.celular}
                  onChange={handleChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="usuario">Usuario</Label>
                <Input
                  id="usuario"
                  name="usuario"
                  type="text"
                  placeholder="nombre.usuario"
                  value={formData.usuario}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Contraseña (opcional)</Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Se generará automáticamente si está vacío"
                    value={formData.password}
                    onChange={handleChange}
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
                  Si no especificas una contraseña, se generará una automáticamente
                </p>
              </div>

              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary-light text-primary-foreground mt-6"
                disabled={isLoading}
              >
                {isLoading ? "Creando..." : "Crear cliente"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showSuccessModal} onOpenChange={handleCloseModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-primary">Cliente Creado Exitosamente</DialogTitle>
            <DialogDescription>Guarda estas credenciales. La contraseña solo se mostrará esta vez.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Correo</Label>
              <div className="p-3 bg-secondary rounded-lg font-mono text-sm">{createdClient?.correo}</div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Contraseña</Label>
              <div className="p-3 bg-secondary rounded-lg font-mono text-sm">{createdClient?.password}</div>
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
