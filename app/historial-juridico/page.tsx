"use client"

import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/data-table"
import { Download, Scale } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface HistorialJuridico {
  id: string
  fecha: string
  estado: "pendiente" | "en_proceso" | "resuelto" | "archivado"
  nombre: string
}

// Mock data for demonstration
const mockHistorial: HistorialJuridico[] = [
  {
    id: "1",
    fecha: "2024-01-15",
    estado: "resuelto",
    nombre: "Caso administrativo #001",
  },
  {
    id: "2",
    fecha: "2024-01-20",
    estado: "en_proceso",
    nombre: "Revisión contractual #002",
  },
  {
    id: "3",
    fecha: "2024-02-01",
    estado: "pendiente",
    nombre: "Consulta legal #003",
  },
  {
    id: "4",
    fecha: "2024-02-10",
    estado: "archivado",
    nombre: "Documento legal #004",
  },
  {
    id: "5",
    fecha: "2024-02-15",
    estado: "en_proceso",
    nombre: "Proceso disciplinario #005",
  },
]

const estadoConfig: Record<
  HistorialJuridico["estado"],
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  pendiente: { label: "Pendiente", variant: "secondary" },
  en_proceso: { label: "En proceso", variant: "default" },
  resuelto: { label: "Resuelto", variant: "outline" },
  archivado: { label: "Archivado", variant: "secondary" },
}

export default function HistorialJuridicoPage() {
  const handleDownload = (nombre: string) => {
    // Mock download - would trigger PDF download with Supabase storage
    console.log(`Downloading PDF for ${nombre}`)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-CO", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const columns = [
    {
      header: "Fecha",
      accessorKey: (row: HistorialJuridico) => <span className="text-foreground">{formatDate(row.fecha)}</span>,
    },
    {
      header: "Estado",
      accessorKey: (row: HistorialJuridico) => {
        const config = estadoConfig[row.estado]
        return (
          <Badge
            variant={config.variant}
            className={
              row.estado === "en_proceso"
                ? "bg-accent text-accent-foreground"
                : row.estado === "resuelto"
                  ? "border-green-600 text-green-600"
                  : ""
            }
          >
            {config.label}
          </Badge>
        )
      },
    },
    {
      header: "Nombre",
      accessorKey: "nombre" as const,
      className: "font-medium",
    },
    {
      header: "Acción",
      accessorKey: (row: HistorialJuridico) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleDownload(row.nombre)}
          className="border-accent text-accent hover:bg-accent hover:text-accent-foreground"
        >
          <Download className="h-4 w-4 mr-2" />
          Descargar PDF
        </Button>
      ),
      className: "text-right",
    },
  ]

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-accent/10">
            <Scale className="h-6 w-6 text-accent" />
          </div>
          <h1 className="text-3xl font-bold text-primary">Historial Jurídico</h1>
        </div>
        <p className="text-muted-foreground">Consulta y descarga los documentos del historial jurídico</p>
      </div>

      <DataTable columns={columns} data={mockHistorial} emptyMessage="No hay registros en el historial jurídico" />
    </div>
  )
}
