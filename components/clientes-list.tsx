"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Users, Search, UserPlus, FileText, Loader2 } from "lucide-react"
import type { Cliente } from "@/lib/db/schema"

export function ClientesList() {
  const [searchTerm, setSearchTerm] = useState("")
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchClientes() {
      try {
        const response = await fetch("/api/clientes")
        if (!response.ok) {
          throw new Error("Error al cargar clientes")
        }
        const data = await response.json()
        setClientes(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error desconocido")
      } finally {
        setIsLoading(false)
      }
    }

    fetchClientes()
  }, [])

  const filteredClientes = clientes.filter((cliente) => cliente.nombre.toLowerCase().includes(searchTerm.toLowerCase()))

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
              <Users className="h-6 w-6 text-accent" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-primary">Clientes</h1>
              <p className="text-muted-foreground">Gestiona los clientes registrados en el sistema</p>
            </div>
          </div>
          <Button asChild className="bg-primary hover:bg-primary-light text-primary-foreground">
            <Link href="/clientes/crear">
              <UserPlus className="h-4 w-4 mr-2" />
              Crear cliente
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
        {filteredClientes.length === 0 && !error ? (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            {searchTerm ? "No se encontraron clientes con ese nombre" : "No hay clientes registrados"}
          </div>
        ) : (
          filteredClientes.map((cliente) => (
            <Card key={cliente.id} className="border-border hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h3 className="font-semibold text-primary text-lg">{cliente.nombre}</h3>
                    <p className="text-sm text-muted-foreground">{cliente.correo}</p>
                    <p className="text-sm text-muted-foreground">{cliente.celular}</p>
                    <p className="text-xs text-muted-foreground/70">@{cliente.usuario}</p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-border">
                  <Button
                    asChild
                    variant="outline"
                    className="w-full border-accent text-accent hover:bg-accent hover:text-accent-foreground bg-transparent"
                  >
                    <Link href={`/clientes/${cliente.id}/documentos`}>
                      <FileText className="h-4 w-4 mr-2" />
                      Documentos
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
