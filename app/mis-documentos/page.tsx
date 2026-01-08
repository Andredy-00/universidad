"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { FileText, Download, Loader2, File, Calendar, AlertCircle, FolderOpen } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from "@/context/auth-context"
import type { Documento } from "@/lib/db/schema"

export default function MisDocumentosPage() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()

  const [documentos, setDocumentos] = useState<Documento[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  const fetchMisDocumentos = useCallback(async () => {
    try {
      const response = await fetch("/api/mis-documentos")
      if (!response.ok) {
        if (response.status === 401) {
          router.push("/login")
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
  }, [router])

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login")
      return
    }
    if (!authLoading && isAuthenticated) {
      fetchMisDocumentos()
    }
  }, [authLoading, isAuthenticated, router, fetchMisDocumentos])

  const handleDownload = async (documentoId: string) => {
    setDownloadingId(documentoId)
    try {
      const response = await fetch(`/api/documentos/${documentoId}/download`)
      if (!response.ok) {
        throw new Error("Error al descargar")
      }
      const data = await response.json()

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

  if (authLoading || isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2 rounded-lg bg-accent/10">
          <FolderOpen className="h-6 w-6 text-accent" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-primary">Mis Documentos</h1>
          <p className="text-muted-foreground">Documentos asignados a tu cuenta</p>
        </div>
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
            <p className="text-muted-foreground">No tienes documentos disponibles</p>
            <p className="text-sm text-muted-foreground mt-2">
              Cuando el administrador suba documentos a tu cuenta, aparecerán aquí
            </p>
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
