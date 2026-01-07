"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Users, Search, UserPlus, FileText } from "lucide-react"

interface Cliente {
  id: string
  nombre: string
  correo: string
  celular: string
  usuario: string
}

// Mock data for demonstration
const mockClientes: Cliente[] = [
  {
    id: "1",
    nombre: "Juan Carlos Pérez",
    correo: "juan.perez@email.com",
    celular: "+57 300 111 2222",
    usuario: "juan.perez",
  },
  {
    id: "2",
    nombre: "María Fernanda López",
    correo: "maria.lopez@email.com",
    celular: "+57 301 222 3333",
    usuario: "maria.lopez",
  },
  {
    id: "3",
    nombre: "Carlos Andrés García",
    correo: "carlos.garcia@email.com",
    celular: "+57 302 333 4444",
    usuario: "carlos.garcia",
  },
  {
    id: "4",
    nombre: "Ana María Rodríguez",
    correo: "ana.rodriguez@email.com",
    celular: "+57 303 444 5555",
    usuario: "ana.rodriguez",
  },
  {
    id: "5",
    nombre: "Pedro Luis Martínez",
    correo: "pedro.martinez@email.com",
    celular: "+57 304 555 6666",
    usuario: "pedro.martinez",
  },
]

export function ClientesList() {
  const [searchTerm, setSearchTerm] = useState("")

  const filteredClientes = mockClientes.filter((cliente) =>
    cliente.nombre.toLowerCase().includes(searchTerm.toLowerCase()),
  )

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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredClientes.length === 0 ? (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            No se encontraron clientes con ese nombre
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
                    <Link href={`/clientes/${cliente.id}/procesos`}>
                      <FileText className="h-4 w-4 mr-2" />
                      Procesos
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
