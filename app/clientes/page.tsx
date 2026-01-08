import { Suspense } from "react"
import { ClientesList } from "@/components/clientes-list"

export default function ClientesPage() {
  return (
    <Suspense fallback={null}>
      <ClientesList />
    </Suspense>
  )
}
