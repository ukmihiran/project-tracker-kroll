import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { redirect } from "next/navigation"
import DashboardClient from "./DashboardClient"
import { getProjects, getDashboardStats } from "@/app/actions/projectActions"
import { getEfrs } from "@/app/actions/efrActions"

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/login')
  }

  const [projects, efrs, dashboardStats] = await Promise.all([
    getProjects(),
    getEfrs(),
    getDashboardStats(),
  ])

  return (
    <DashboardClient
      initialProjects={projects}
      initialEfrs={efrs}
      dashboardStats={dashboardStats}
      currentUser={session.user}
    />
  )
}
