"use client"

import { useAuth } from "@/context/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, Scale, Users, Shield, FolderOpen } from "lucide-react"
import Link from "next/link"

export default function HomePage() {
  const { isAuthenticated, user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-pulse text-muted-foreground">Cargando...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-12">
      {!isAuthenticated ? (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <h1 className="text-4xl font-bold text-primary mb-4">Bienvenido a Universidad</h1>
          <p className="text-lg text-muted-foreground mb-8 max-w-md">
            Sistema administrativo moderno para la gestión universitaria
          </p>
          <Button asChild size="lg" className="bg-primary hover:bg-primary/90">
            <Link href="/login">Iniciar sesión</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-primary">Hola, {user?.name}</h1>
              <p className="text-muted-foreground mt-1">Panel de control del sistema</p>
            </div>
            <div className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
              {user?.role === "super_admin" ? "Super Admin" : "Usuario"}
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card className="hover:shadow-md transition-shadow border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Transacciones</CardTitle>
                <FileText className="h-5 w-5 text-accent" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">24</div>
                <p className="text-xs text-muted-foreground mt-1">Documentos disponibles</p>
                <Button asChild variant="link" className="px-0 mt-2 text-accent">
                  <Link href="/transacciones">Ver todas</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Historial Jurídico</CardTitle>
                <Scale className="h-5 w-5 text-accent" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">12</div>
                <p className="text-xs text-muted-foreground mt-1">Registros legales</p>
                <Button asChild variant="link" className="px-0 mt-2 text-accent">
                  <Link href="/historial-juridico">Ver historial</Link>
                </Button>
              </CardContent>
            </Card>

            {user?.role !== "super_admin" && (
              <Card className="hover:shadow-md transition-shadow border-border">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Mis Documentos</CardTitle>
                  <FolderOpen className="h-5 w-5 text-accent" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">PDFs</div>
                  <p className="text-xs text-muted-foreground mt-1">Documentos asignados</p>
                  <Button asChild variant="link" className="px-0 mt-2 text-accent">
                    <Link href="/mis-documentos">Ver documentos</Link>
                  </Button>
                </CardContent>
              </Card>
            )}

            {user?.role === "super_admin" && (
              <>
                <Card className="hover:shadow-md transition-shadow border-border">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Clientes</CardTitle>
                    <Users className="h-5 w-5 text-accent" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-primary">8</div>
                    <p className="text-xs text-muted-foreground mt-1">Clientes registrados</p>
                    <Button asChild variant="link" className="px-0 mt-2 text-accent">
                      <Link href="/clientes">Gestionar</Link>
                    </Button>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-md transition-shadow border-border">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Administración</CardTitle>
                    <Shield className="h-5 w-5 text-accent" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-primary">Admin</div>
                    <p className="text-xs text-muted-foreground mt-1">Acceso completo</p>
                    <Button asChild variant="link" className="px-0 mt-2 text-accent">
                      <Link href="/clientes/crear">Crear cliente</Link>
                    </Button>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
