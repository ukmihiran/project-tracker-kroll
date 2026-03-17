import { fireEvent, render, screen, waitFor } from "@testing-library/react"

import WorkspaceSettingsPanel from "./WorkspaceSettingsPanel"

const confirmMock = jest.fn()
const toastInfoMock = jest.fn()

jest.mock("@/components/ConfirmDialog", () => ({
  useConfirm: () => confirmMock,
}))

jest.mock("react-toastify", () => ({
  toast: {
    info: (...args: unknown[]) => toastInfoMock(...args),
  },
}))

describe("WorkspaceSettingsPanel", () => {
  const baseWorkCycles = [
    {
      id: "cycle-2026",
      name: "2026 Workspace",
      year: 2026,
      status: "ACTIVE",
      startDate: new Date("2026-01-01T00:00:00.000Z"),
      endDate: new Date("2026-12-31T23:59:59.999Z"),
      focusText: "Focus on delivery",
    },
    {
      id: "cycle-2025",
      name: "2025 Workspace",
      year: 2025,
      status: "CLOSED",
      startDate: new Date("2025-01-01T00:00:00.000Z"),
      endDate: new Date("2025-12-31T23:59:59.999Z"),
      focusText: "Close out old work",
    },
  ]

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date("2026-03-17T09:00:00.000Z"))
    jest.clearAllMocks()
    confirmMock.mockResolvedValue(true)
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it("opens the already-prepared next workspace instead of creating another one", () => {
    const onSelectCycle = jest.fn()

    render(
      <WorkspaceSettingsPanel
        workCycles={[
          ...baseWorkCycles,
          {
            id: "cycle-2027",
            name: "2027 Workspace",
            year: 2027,
            status: "PLANNED",
            startDate: new Date("2027-01-01T00:00:00.000Z"),
            endDate: new Date("2027-12-31T23:59:59.999Z"),
            focusText: "Next year",
          },
        ]}
        selectedCycleId="cycle-2026"
        projects={[]}
        efrs={[]}
        tasks={[]}
        onSelectCycle={onSelectCycle}
        onCreateWorkspace={jest.fn()}
        onEditWorkspace={jest.fn()}
        onPrepareNextYear={jest.fn().mockResolvedValue(true)}
        onDeleteWorkspace={jest.fn().mockResolvedValue(true)}
      />
    )

    fireEvent.click(screen.getByRole("button", { name: "Open 2027" }))

    expect(onSelectCycle).toHaveBeenCalledWith("cycle-2027")
    expect(toastInfoMock).toHaveBeenCalledWith("2027 workspace is already ready")
  })

  it("keeps delete disabled for the current year and non-empty workspaces", () => {
    render(
      <WorkspaceSettingsPanel
        workCycles={baseWorkCycles}
        selectedCycleId="cycle-2026"
        projects={[{ id: "project-1", workCycleId: "cycle-2025" }]}
        efrs={[]}
        tasks={[]}
        onSelectCycle={jest.fn()}
        onCreateWorkspace={jest.fn()}
        onEditWorkspace={jest.fn()}
        onPrepareNextYear={jest.fn().mockResolvedValue(true)}
        onDeleteWorkspace={jest.fn().mockResolvedValue(true)}
      />
    )

    const deleteButtons = screen.getAllByRole("button", { name: "Delete" })

    expect(deleteButtons[0]).toBeDisabled()
    expect(deleteButtons[1]).toBeDisabled()
    expect(screen.getByText("The current calendar year stays pinned as your active workspace.")).toBeInTheDocument()
    expect(screen.getByText("Delete becomes available after this workspace is fully empty.")).toBeInTheDocument()
  })

  it("confirms and deletes an empty past workspace", async () => {
    const onDeleteWorkspace = jest.fn().mockResolvedValue(true)

    render(
      <WorkspaceSettingsPanel
        workCycles={baseWorkCycles}
        selectedCycleId="cycle-2026"
        projects={[]}
        efrs={[]}
        tasks={[]}
        onSelectCycle={jest.fn()}
        onCreateWorkspace={jest.fn()}
        onEditWorkspace={jest.fn()}
        onPrepareNextYear={jest.fn().mockResolvedValue(true)}
        onDeleteWorkspace={onDeleteWorkspace}
      />
    )

    const deleteButtons = screen.getAllByRole("button", { name: "Delete" })
    fireEvent.click(deleteButtons[1])

    expect(confirmMock).toHaveBeenCalled()
    await waitFor(() => {
      expect(onDeleteWorkspace).toHaveBeenCalledWith(expect.objectContaining({ id: "cycle-2025" }))
    })
  })
})
