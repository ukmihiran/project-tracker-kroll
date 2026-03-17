import { fireEvent, render, screen } from "@testing-library/react";

import DashboardClient from "./DashboardClient";

jest.mock("@/components/Sidebar", () => ({
  __esModule: true,
  default: ({ onTabChange }: { onTabChange: (tab: string) => void }) => (
    <div>
      <button onClick={() => onTabChange("dashboard")}>Dashboard tab</button>
      <button onClick={() => onTabChange("assessments")}>Assessments tab</button>
    </div>
  ),
}));

jest.mock("./ProjectList", () => ({
  __esModule: true,
  default: ({ searchQuery }: { searchQuery: string }) => <div data-testid="project-list-search">{searchQuery}</div>,
}));

jest.mock("./ProjectModal", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("./TaskPage", () => ({
  __esModule: true,
  default: () => <div>Task page</div>,
}));

jest.mock("./TaskModal", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("./GoalDashboard", () => ({
  __esModule: true,
  default: () => <div>Goal dashboard</div>,
}));

jest.mock("./EfrModal", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("./EfrPage", () => ({
  __esModule: true,
  default: () => <div>EFR page</div>,
}));

jest.mock("./CalendarView", () => ({
  __esModule: true,
  default: () => <div>Calendar view</div>,
}));

jest.mock("./ProfilePage", () => ({
  __esModule: true,
  default: () => <div>Profile page</div>,
}));

jest.mock("./ArchivePage", () => ({
  __esModule: true,
  default: () => <div>Archive page</div>,
}));

jest.mock("./WorkCycleModal", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("./NotificationDropdown", () => ({
  __esModule: true,
  default: () => <div>Notifications</div>,
}));

jest.mock("@/lib/exportUtils", () => ({
  exportProjectsPDF: jest.fn(),
  exportProjectsExcel: jest.fn(),
}));

jest.mock("@/app/actions/workCycleActions", () => ({
  createNextYearWorkspace: jest.fn(),
  getWorkCycles: jest.fn(),
}));

jest.mock("@/app/actions/projectActions", () => ({
  getProjects: jest.fn(),
}));

jest.mock("@/app/actions/efrActions", () => ({
  getEfrs: jest.fn(),
}));

jest.mock("@/app/actions/taskActions", () => ({
  getTasks: jest.fn(),
}));

describe("DashboardClient", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("wires the header search input to the assessments view", () => {
    render(
      <DashboardClient
        initialProjects={[]}
        initialEfrs={[]}
        initialTasks={[]}
        initialWorkCycles={[{ id: "cycle-1", name: "2026 Workspace", year: 2026, status: "ACTIVE", startDate: new Date(), endDate: new Date(), billableTarget: 1500, efrTarget: 3, multiPersonTarget: 1 }]}
        initialCycleId="cycle-1"
        currentUser={{ name: "Jane Doe", email: "jane@example.com" }}
      />
    );

    const headerSearch = screen.getByPlaceholderText("Search available in Assessments");
    expect(headerSearch).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Assessments tab" }));

    const enabledSearch = screen.getByPlaceholderText("Search assessments...");
    expect(enabledSearch).not.toBeDisabled();

    fireEvent.change(enabledSearch, { target: { value: "cloud" } });

    expect(screen.getByTestId("project-list-search")).toHaveTextContent("cloud");
  });

  it("lets the user dismiss the welcome banner", () => {
    render(
      <DashboardClient
        initialProjects={[]}
        initialEfrs={[]}
        initialTasks={[]}
        initialWorkCycles={[{ id: "cycle-1", name: "2026 Workspace", year: 2026, status: "ACTIVE", startDate: new Date(), endDate: new Date(), billableTarget: 1500, efrTarget: 3, multiPersonTarget: 1 }]}
        initialCycleId="cycle-1"
        currentUser={{ name: "Jane Doe", email: "jane@example.com" }}
      />
    );

    expect(screen.getByText("Welcome back, Jane.")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Dismiss welcome banner"));

    expect(screen.queryByText("Welcome back, Jane.")).not.toBeInTheDocument();
  });
});
