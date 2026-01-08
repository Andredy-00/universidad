"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { CheckCircle, XCircle, Loader2 } from "lucide-react"

export default function SetupPage() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [message, setMessage] = useState("")

  const createAdmin = async () => {
    setStatus("loading")
    try {
      const response = await fetch("/api/auth/create-admin", {
        method: "POST",
      })
      const data = await response.json()

      if (data.success) {
        setStatus("success")
        setMessage(data.message)
      } else {
        setStatus("error")
        setMessage(data.error || "Error al crear el usuario admin")
      }
    } catch (error) {
      setStatus("error")
      setMessage(String(error))
    }
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Configuración Inicial</CardTitle>
            <CardDescription>Crear usuario administrador del sistema</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-muted rounded-lg text-sm">
              <p className="font-medium mb-2">Credenciales del Admin:</p>
              <p>Email: admin@universidad.edu</p>
              <p>Contraseña: 123456789</p>
            </div>

            {status === "success" && (
              <div className="flex items-center gap-2 p-4 bg-green-50 text-green-700 rounded-lg">
                <CheckCircle className="h-5 w-5" />
                <span>{message}</span>
              </div>
            )}

            {status === "error" && (
              <div className="flex items-center gap-2 p-4 bg-red-50 text-red-700 rounded-lg">
                <XCircle className="h-5 w-5" />
                <span>{message}</span>
              </div>
            )}

            <Button onClick={createAdmin} disabled={status === "loading"} className="w-full">
              {status === "loading" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {status === "loading" ? "Creando..." : "Crear Usuario Admin"}
            </Button>

            {status === "success" && (
              <Button asChild variant="outline" className="w-full bg-transparent">
                <a href="/login">Ir al Login</a>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
