"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/context/auth-context"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Settings, LogOut, FileText, Scale, Users, UserPlus, LayoutGrid, FolderOpen, ShieldCheck } from "lucide-react"

export function Navbar() {
  const { user, isAuthenticated, isLoading, logout } = useAuth()
  const router = useRouter()

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const handleLogout = async () => {
    await logout()
    router.push("/login")
    router.refresh()
  }

  const getRoleLabel = (role: string | null) => {
    switch (role) {
      case "super_admin":
        return "Super Admin"
      case "admin":
        return "Admin"
      default:
        return "Usuario"
    }
  }

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border bg-card shadow-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="text-xl font-semibold text-primary tracking-tight">
          Universidad
        </Link>

        <div className="flex items-center gap-3">
          {isLoading ? (
            <div className="h-9 w-9 rounded-full bg-muted animate-pulse" />
          ) : !isAuthenticated ? (
            <Button asChild variant="default" className="bg-primary hover:bg-primary/90">
              <Link href="/login">Iniciar sesión</Link>
            </Button>
          ) : (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary">
                    <LayoutGrid className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {(user?.role === "super_admin" || user?.role === "admin") && (
                    <>
                      <DropdownMenuItem asChild>
                        <Link href="/transacciones" className="flex items-center gap-2 cursor-pointer">
                          <FileText className="h-4 w-4" />
                          Transacciones
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/historial-juridico" className="flex items-center gap-2 cursor-pointer">
                          <Scale className="h-4 w-4" />
                          Historial jurídico
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  {/* Usuario normal (cliente) ve sus documentos */}
                  {user?.role === "user" && (
                    <>
                      <DropdownMenuItem asChild>
                        <Link href="/historial-juridico" className="flex items-center gap-2 cursor-pointer">
                          <Scale className="h-4 w-4" />
                          Historial jurídico
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href="/mis-documentos" className="flex items-center gap-2 cursor-pointer">
                          <FolderOpen className="h-4 w-4" />
                          Mis Documentos
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                    <Avatar className="h-9 w-9 border-2 border-primary/20">
                      <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                        {user?.name ? getInitials(user.name) : "U"}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium">{user?.name}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                    <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded bg-primary/10 text-primary">
                      {getRoleLabel(user?.role || null)}
                    </span>
                  </div>
                  <DropdownMenuSeparator />

                  {user?.role === "super_admin" && (
                    <>
                      <DropdownMenuItem asChild>
                        <Link href="/admins/crear" className="flex items-center gap-2 cursor-pointer">
                          <ShieldCheck className="h-4 w-4" />
                          Crear admin
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/admins" className="flex items-center gap-2 cursor-pointer">
                          <ShieldCheck className="h-4 w-4" />
                          Administradores
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}

                  {/* Opciones para super_admin y admin */}
                  {(user?.role === "super_admin" || user?.role === "admin") && (
                    <>
                      <DropdownMenuItem asChild>
                        <Link href="/clientes/crear" className="flex items-center gap-2 cursor-pointer">
                          <UserPlus className="h-4 w-4" />
                          Crear cliente
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/clientes" className="flex items-center gap-2 cursor-pointer">
                          <Users className="h-4 w-4" />
                          Clientes
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}

                  <DropdownMenuItem asChild>
                    <Link href="/ajustes" className="flex items-center gap-2 cursor-pointer">
                      <Settings className="h-4 w-4" />
                      Ajustes
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive"
                  >
                    <LogOut className="h-4 w-4" />
                    Cerrar sesión
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
