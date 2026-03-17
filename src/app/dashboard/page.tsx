import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { redirect } from "next/navigation"
import DashboardClient from "./DashboardClient"
import { getProjects } from "@/app/actions/projectActions"
import { getEfrs } from "@/app/actions/efrActions"
import { getTasks } from "@/app/actions/taskActions"
import { getWorkCycles } from "@/app/actions/workCycleActions"
import { getProfile } from "@/app/actions/profileActions"

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/login')
  }

  const [projects, efrs, tasks, workCycles, profileResult] = await Promise.all([
    getProjects({ includeArchived: true, allCycles: true }),
    getEfrs({ includeArchived: true, allCycles: true }),
    getTasks({ includeArchived: true, allCycles: true }),
    getWorkCycles(),
    getProfile(),
  ])

  const currentYear = new Date().getFullYear()
  const currentCycle = workCycles.find((cycle: any) => cycle.year === currentYear)
    ?? workCycles[0]

  return (
    <DashboardClient
      initialProjects={projects}
      initialEfrs={efrs}
      initialTasks={tasks}
      initialWorkCycles={workCycles}
      initialCycleId={currentCycle?.id}
      currentUser={session.user}
      initialProfile={profileResult.success ? profileResult.user : null}
    />
  )
}
