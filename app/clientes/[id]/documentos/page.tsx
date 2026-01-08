"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ArrowLeft, FileText, Upload, Download, Loader2, File, Calendar, AlertCircle } from "lucide-react"
import Link from "next/link"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from "@/context/auth-context"
import type { Documento } from "@/lib/db/schema"

export default function DocumentosClientePage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const clienteId = params.id as string

  const [documentos, setDocumentos] = useState<Documento[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  // Form state
  const [nombre, setNombre] = useState("")
  const [descripcion, setDescripcion] = useState("")
  const [file, setFile] = useState<File | null>(null)

  const isAdmin = user?.role === "super_admin"

  const fetchDocumentos = useCallback(async () => {
    try {
      const response = await fetch(`/api/clientes/${clienteId}/documentos`)
      if (!response.ok) {
        if (response.status === 403) {
          router.push("/")
          return
        }
        throw new Error("Error al cargar documentos")
      }
      const data = await response.json()
      setDocumentos(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setIsLoading(false)
    }
  }, [clienteId, router])

  useEffect(() => {
    fetchDocumentos()
  }, [fetchDocumentos])

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file || !nombre) return

    setIsUploading(true)
    setUploadError(null)

    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("nombre", nombre)
      formData.append("descripcion", descripcion)

      const response = await fetch(`/api/clientes/${clienteId}/documentos`, {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Error al subir documento")
      }

      // Reset form and refresh list
      setNombre("")
      setDescripcion("")
      setFile(null)
      setIsDialogOpen(false)
      fetchDocumentos()
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Error al subir documento")
    } finally {
      setIsUploading(false)
    }
  }

  const handleDownload = async (documentoId: string) => {
    setDownloadingId(documentoId)
    try {
      const response = await fetch(`/api/documentos/${documentoId}/download`)
      if (!response.ok) {
        throw new Error("Error al descargar")
      }
      const data = await response.json()

      // Abrir URL de descarga en nueva pestaña
      const link = document.createElement("a")
      link.href = data.url
      link.download = data.nombreArchivo
      link.target = "_blank"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al descargar")
    } finally {
      setDownloadingId(null)
    }
  }

  const formatFileSize = (bytes: string | null) => {
    if (!bytes) return "N/A"
    const size = Number.parseInt(bytes)
    if (size < 1024) return `${size} B`
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
    return `${(size / (1024 * 1024)).toFixed(1)} MB`
  }

  const formatDate = (date: Date | null) => {
    if (!date) return "N/A"
    return new Date(date).toLocaleDateString("es-CO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  }

  if (isLoading) {
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
          <Link href={isAdmin ? "/clientes" : "/"}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {isAdmin ? "Volver a clientes" : "Volver al inicio"}
          </Link>
        </Button>
      </div>

      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-accent/10">
            <FileText className="h-6 w-6 text-accent" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-primary">Documentos</h1>
            <p className="text-muted-foreground">
              {isAdmin ? "Gestiona los documentos del cliente" : "Tus documentos disponibles"}
            </p>
          </div>
        </div>

        {isAdmin && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary-light text-primary-foreground">
                <Upload className="h-4 w-4 mr-2" />
                Subir documento
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Subir nuevo documento</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleUpload} className="space-y-4">
                {uploadError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{uploadError}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre del documento</Label>
                  <Input
                    id="nombre"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Ej: Contrato de servicios"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="descripcion">Descripción (opcional)</Label>
                  <Textarea
                    id="descripcion"
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    placeholder="Descripción breve del documento..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="file">Archivo PDF</Label>
                  <Input
                    id="file"
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    required
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={isUploading || !file || !nombre}
                    className="bg-primary hover:bg-primary-light"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Subiendo...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Subir
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {documentos.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No hay documentos disponibles</p>
            {isAdmin && (
              <p className="text-sm text-muted-foreground mt-2">Sube el primer documento usando el botón de arriba</p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {documentos.map((doc) => (
            <Card key={doc.id} className="border-border hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-destructive/10">
                    <File className="h-5 w-5 text-destructive" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base font-semibold text-primary truncate">{doc.nombre}</CardTitle>
                    <CardDescription className="text-sm truncate">{doc.nombreArchivo}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {doc.descripcion && (
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{doc.descripcion}</p>
                )}
                <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(doc.createdAt)}
                  </span>
                  <span>{formatFileSize(doc.tamano)}</span>
                </div>
                <Button
                  onClick={() => handleDownload(doc.id)}
                  disabled={downloadingId === doc.id}
                  variant="outline"
                  className="w-full border-accent text-accent hover:bg-accent hover:text-accent-foreground"
                >
                  {downloadingId === doc.id ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Descargando...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Descargar PDF
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
