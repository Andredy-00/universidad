"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/data-table"
import { Download, Scale, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/context/auth-context"
import type { ProcesoJuridico } from "@/lib/db/schema"

interface ProcesoConCliente extends ProcesoJuridico {
  clienteNombre?: string
}

const estadoConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pendiente: { label: "Pendiente", variant: "secondary" },
  en_proceso: { label: "En proceso", variant: "default" },
  resuelto: { label: "Resuelto", variant: "outline" },
  archivado: { label: "Archivado", variant: "secondary" },
}

export default function HistorialJuridicoPage() {
  const { role } = useAuth()
  const [procesos, setProcesos] = useState<ProcesoConCliente[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchProcesos() {
      try {
        const response = await fetch("/api/procesos")
        if (response.ok) {
          const data = await response.json()
          setProcesos(data)
        }
      } catch (error) {
        console.error("Error fetching procesos:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchProcesos()
  }, [])

  const handleDownload = async (procesoId: string) => {
    try {
      const response = await fetch(`/api/procesos/${procesoId}/download`)
      const data = await response.json()

      if (data.url) {
        window.open(data.url, "_blank")
      }
    } catch (error) {
      console.error("Error downloading:", error)
    }
  }

  const formatDate = (dateString: string | Date | null) => {
    if (!dateString) return ""
    return new Date(dateString).toLocaleDateString("es-CO", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const columns = [
    {
      header: "Fecha",
      accessorKey: (row: ProcesoConCliente) => <span className="text-foreground">{formatDate(row.createdAt)}</span>,
    },
    ...(role === "super_admin"
      ? [
          {
            header: "Cliente",
            accessorKey: (row: ProcesoConCliente) => (
              <span className="text-foreground">{row.clienteNombre || "-"}</span>
            ),
          },
        ]
      : []),
    {
      header: "Estado",
      accessorKey: (row: ProcesoConCliente) => {
        const config = estadoConfig[row.estado || "pendiente"]
        return (
          <Badge
            variant={config?.variant}
            className={
              row.estado === "en_proceso"
                ? "bg-accent text-accent-foreground"
                : row.estado === "resuelto"
                  ? "border-green-600 text-green-600"
                  : ""
            }
          >
            {config?.label}
          </Badge>
        )
      },
    },
    {
      header: "Caso",
      accessorKey: "caso" as const,
      className: "font-medium",
    },
    {
      header: "Acción",
      accessorKey: (row: ProcesoConCliente) =>
        row.storagePath ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDownload(row.id)}
            className="border-accent text-accent hover:bg-accent hover:text-accent-foreground"
          >
            <Download className="h-4 w-4 mr-2" />
            Descargar PDF
          </Button>
        ) : (
          <span className="text-muted-foreground text-sm">Sin archivo</span>
        ),
      className: "text-right",
    },
  ]

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
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-accent/10">
            <Scale className="h-6 w-6 text-accent" />
          </div>
          <h1 className="text-3xl font-bold text-primary">Historial Jurídico</h1>
        </div>
        <p className="text-muted-foreground">
          {role === "super_admin"
            ? "Consulta todos los procesos jurídicos del sistema"
            : "Consulta y descarga los documentos de tus procesos jurídicos"}
        </p>
      </div>

      <DataTable columns={columns} data={procesos} emptyMessage="No hay registros en el historial jurídico" />
    </div>
  )
}
