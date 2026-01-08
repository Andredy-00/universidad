"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { UserPlus, ArrowLeft, AlertCircle } from "lucide-react"
import Link from "next/link"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function CrearClientePage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    correo: "",
    nombre: "",
    celular: "",
    usuario: "",
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

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Error al crear cliente")
      }

      router.push("/clientes")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear cliente")
    } finally {
      setIsLoading(false)
    }
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
              Ingresa los datos para registrar un nuevo cliente
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
    </div>
  )
}
