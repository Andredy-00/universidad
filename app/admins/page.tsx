import { Suspense } from "react"
import { AdminsList } from "@/components/admins-list"
import { Loader2 } from "lucide-react"

export default function AdminsPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <AdminsList />
    </Suspense>
  )
}
