"use client"

import type React from "react"
import { useState, useEffect, use } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Save, Edit, Trash2, Upload, FileText, Scale, Download, Loader2 } from "lucide-react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import type { ProcesoJuridico, Cliente } from "@/lib/db/schema"

const estadoConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pendiente: { label: "Pendiente", variant: "secondary" },
  en_proceso: { label: "En proceso", variant: "default" },
  resuelto: { label: "Resuelto", variant: "outline" },
  archivado: { label: "Archivado", variant: "secondary" },
}

export default function ProcesosClientePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: clienteId } = use(params)
  const [procesos, setProcesos] = useState<ProcesoJuridico[]>([])
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [formData, setFormData] = useState({
    caso: "",
    estado: "pendiente",
    nota: "",
    pdfFile: null as File | null,
  })

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch cliente info
        const clienteRes = await fetch(`/api/clientes`)
        const clientes = await clienteRes.json()
        const foundCliente = clientes.find((c: Cliente) => c.id === clienteId)
        setCliente(foundCliente || null)

        // Fetch procesos
        const procesosRes = await fetch(`/api/procesos?clienteId=${clienteId}`)
        const procesosData = await procesosRes.json()
        setProcesos(procesosData)
      } catch (error) {
        console.error("Error fetching data:", error)
      } finally {
        setIsLoadingData(false)
      }
    }

    fetchData()
  }, [clienteId])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData((prev) => ({ ...prev, pdfFile: e.target.files![0] }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const submitData = new FormData()
      submitData.append("clienteId", clienteId)
      submitData.append("caso", formData.caso)
      submitData.append("estado", formData.estado)
      submitData.append("nota", formData.nota)
      if (formData.pdfFile) {
        submitData.append("file", formData.pdfFile)
      }

      const url = editingId ? `/api/procesos/${editingId}` : "/api/procesos"
      const method = editingId ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        body: submitData,
      })

      if (!response.ok) {
        throw new Error("Error al guardar proceso")
      }

      // Refresh procesos
      const procesosRes = await fetch(`/api/procesos?clienteId=${clienteId}`)
      const procesosData = await procesosRes.json()
      setProcesos(procesosData)

      // Reset form
      setEditingId(null)
      setFormData({ caso: "", estado: "pendiente", nota: "", pdfFile: null })
    } catch (error) {
      console.error("Error saving proceso:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleEdit = (proceso: ProcesoJuridico) => {
    setEditingId(proceso.id)
    setFormData({
      caso: proceso.caso,
      estado: proceso.estado || "pendiente",
      nota: proceso.nota || "",
      pdfFile: null,
    })
  }

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar este proceso?")) return

    try {
      const response = await fetch(`/api/procesos/${id}`, { method: "DELETE" })
      if (response.ok) {
        setProcesos((prev) => prev.filter((p) => p.id !== id))
      }
    } catch (error) {
      console.error("Error deleting proceso:", error)
    }
  }

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

  const handleCancelEdit = () => {
    setEditingId(null)
    setFormData({ caso: "", estado: "pendiente", nota: "", pdfFile: null })
  }

  const formatDate = (dateString: string | Date | null) => {
    if (!dateString) return ""
    return new Date(dateString).toLocaleDateString("es-CO", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  if (isLoadingData) {
    return (
      <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
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
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-accent/10">
            <Scale className="h-6 w-6 text-accent" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-primary">Procesos Jurídicos</h1>
            <p className="text-muted-foreground">{cliente?.nombre || "Cliente"}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column - Form */}
        <Card className="border-border h-fit">
          <CardHeader>
            <CardTitle className="text-primary flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {editingId ? "Editar Proceso" : "Crear Proceso"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="caso">Caso</Label>
                <Input
                  id="caso"
                  name="caso"
                  placeholder="Descripción del caso"
                  value={formData.caso}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="estado">Estado</Label>
                <Select
                  value={formData.estado}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, estado: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendiente">Pendiente</SelectItem>
                    <SelectItem value="en_proceso">En proceso</SelectItem>
                    <SelectItem value="resuelto">Resuelto</SelectItem>
                    <SelectItem value="archivado">Archivado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="nota">Nota</Label>
                <Textarea
                  id="nota"
                  name="nota"
                  placeholder="Notas adicionales sobre el proceso..."
                  value={formData.nota}
                  onChange={handleChange}
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pdf">Subir PDF</Label>
                <div className="flex items-center gap-2">
                  <Input id="pdf" type="file" accept=".pdf" onChange={handleFileChange} className="cursor-pointer" />
                  <Upload className="h-5 w-5 text-muted-foreground shrink-0" />
                </div>
                {formData.pdfFile && <p className="text-sm text-muted-foreground">{formData.pdfFile.name}</p>}
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="submit"
                  className="flex-1 bg-primary hover:bg-primary-light text-primary-foreground"
                  disabled={isLoading}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isLoading ? "Guardando..." : "Guardar"}
                </Button>
                {editingId && (
                  <Button type="button" variant="outline" onClick={handleCancelEdit}>
                    Cancelar
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Right Column - Process History */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-primary">Historial de Procesos</CardTitle>
          </CardHeader>
          <CardContent>
            {procesos.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No hay procesos registrados para este cliente
              </div>
            ) : (
              <div className="space-y-4">
                {procesos.map((proceso) => (
                  <div
                    key={proceso.id}
                    className="p-4 rounded-lg border border-border bg-secondary/20 hover:bg-secondary/40 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-primary">{proceso.caso}</h4>
                          <Badge
                            variant={estadoConfig[proceso.estado || "pendiente"]?.variant}
                            className={
                              proceso.estado === "en_proceso"
                                ? "bg-accent text-accent-foreground"
                                : proceso.estado === "resuelto"
                                  ? "border-green-600 text-green-600"
                                  : ""
                            }
                          >
                            {estadoConfig[proceso.estado || "pendiente"]?.label}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{proceso.nota}</p>
                        <p className="text-xs text-muted-foreground/70">{formatDate(proceso.createdAt)}</p>
                        {proceso.nombreArchivo && <p className="text-xs text-accent">{proceso.nombreArchivo}</p>}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        {proceso.storagePath && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDownload(proceso.id)}
                            className="h-8 w-8 text-muted-foreground hover:text-accent"
                            title="Descargar PDF"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(proceso)}
                          className="h-8 w-8 text-muted-foreground hover:text-accent"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(proceso.id)}
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
