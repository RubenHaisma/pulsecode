"use client"

import { useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Code2 } from "lucide-react"
import { DashboardSidebar, MobileDashboardNav } from "@/components/dashboard/sidebar"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { status } = useSession()
  const router = useRouter()
  
  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    }
  }, [status, router])

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-pulse">
          <Code2 className="h-12 w-12 text-gray-400" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background-start to-background-end">
      {/* Desktop Sidebar */}
      <DashboardSidebar />
      
      {/* Mobile Navigation */}
      <MobileDashboardNav />

      {/* Main content - adjusted for sidebar */}
      <main className="lg:pl-64 mt-0">
        <div className="p-4 sm:p-6 lg:p-8 lg:pl-6">
          {children}
        </div>
      </main>
    </div>
  )
} 