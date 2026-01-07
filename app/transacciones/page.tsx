"use client"

import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/data-table"
import { Download, FileText } from "lucide-react"

interface Transaccion {
  id: string
  referencia: string
  nombreEmpleado: string
  nombreEmpleador: string
}

// Mock data for demonstration
const mockTransacciones: Transaccion[] = [
  {
    id: "1",
    referencia: "TRX-2024-001",
    nombreEmpleado: "Juan Carlos Pérez",
    nombreEmpleador: "Universidad Nacional",
  },
  {
    id: "2",
    referencia: "TRX-2024-002",
    nombreEmpleado: "María Fernanda López",
    nombreEmpleador: "Instituto Tecnológico",
  },
  {
    id: "3",
    referencia: "TRX-2024-003",
    nombreEmpleado: "Carlos Andrés García",
    nombreEmpleador: "Fundación Educativa",
  },
  {
    id: "4",
    referencia: "TRX-2024-004",
    nombreEmpleado: "Ana María Rodríguez",
    nombreEmpleador: "Universidad Nacional",
  },
  {
    id: "5",
    referencia: "TRX-2024-005",
    nombreEmpleado: "Pedro Luis Martínez",
    nombreEmpleador: "Centro Académico",
  },
]

export default function TransaccionesPage() {
  const handleDownload = (referencia: string) => {
    // Mock download - would trigger PDF download with Supabase storage
    console.log(`Downloading PDF for ${referencia}`)
  }

  const columns = [
    {
      header: "Número de referencia",
      accessorKey: "referencia" as const,
      className: "font-medium",
    },
    {
      header: "Nombre empleado",
      accessorKey: "nombreEmpleado" as const,
    },
    {
      header: "Nombre empleador",
      accessorKey: "nombreEmpleador" as const,
    },
    {
      header: "Acción",
      accessorKey: (row: Transaccion) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleDownload(row.referencia)}
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
            <FileText className="h-6 w-6 text-accent" />
          </div>
          <h1 className="text-3xl font-bold text-primary">Transacciones</h1>
        </div>
        <p className="text-muted-foreground">Consulta y descarga los documentos de transacciones registradas</p>
      </div>

      <DataTable columns={columns} data={mockTransacciones} emptyMessage="No hay transacciones disponibles" />
    </div>
  )
}
