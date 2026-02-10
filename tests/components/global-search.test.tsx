import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GlobalSearch } from "@/components/search/global-search";

// Mock next/navigation explicitly
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    back: jest.fn(),
    prefetch: jest.fn(),
    refresh: jest.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/",
}));

// Mock useIsMobile
let mockIsMobile = false;
jest.mock("@/hooks/use-media-query", () => ({
  useIsMobile: () => mockIsMobile,
}));

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe("GlobalSearch", () => {
  beforeEach(() => {
    mockIsMobile = false;
    mockFetch.mockClear();
    mockPush.mockClear();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ results: {} }),
    });
  });

  it("renders nothing when not open", () => {
    const { container } = render(<GlobalSearch />);
    expect(container.innerHTML).toBe("");
  });

  it("opens on Ctrl+K", () => {
    render(<GlobalSearch />);
    fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
  });

  it("closes on Escape", () => {
    render(<GlobalSearch />);
    fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByPlaceholderText(/search/i)).not.toBeInTheDocument();
  });

  it("shows keyboard hints on desktop", () => {
    render(<GlobalSearch />);
    fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    expect(screen.getByText("Navigate")).toBeInTheDocument();
    expect(screen.getByText("Select")).toBeInTheDocument();
    expect(screen.getByText("Close")).toBeInTheDocument();
  });

  it("hides keyboard hints on mobile", () => {
    mockIsMobile = true;
    render(<GlobalSearch />);
    fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    expect(screen.queryByText("Navigate")).not.toBeInTheDocument();
  });

  it("shows no results message for empty results", async () => {
    render(<GlobalSearch />);
    fireEvent.keyDown(window, { key: "k", ctrlKey: true });

    const input = screen.getByPlaceholderText(/search/i);
    await userEvent.type(input, "xyz");

    await waitFor(
      () => {
        expect(screen.getByText(/no results found/i)).toBeInTheDocument();
      },
      { timeout: 1000 }
    );
  });

  it("shows search results when API returns data", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          results: {
            campaigns: [
              { id: "c1", name: "Test Campaign", status: "ACTIVE", _count: { prospects: 5 } },
            ],
          },
        }),
    });

    render(<GlobalSearch />);
    fireEvent.keyDown(window, { key: "k", ctrlKey: true });

    const input = screen.getByPlaceholderText(/search/i);
    await userEvent.type(input, "test");

    await waitFor(
      () => {
        expect(screen.getByText("Test Campaign")).toBeInTheDocument();
      },
      { timeout: 1000 }
    );
  });

  it("renders full-screen on mobile", () => {
    mockIsMobile = true;
    render(<GlobalSearch />);
    fireEvent.keyDown(window, { key: "k", ctrlKey: true });

    const modal = screen.getByPlaceholderText(/search/i).closest("[class*='h-full']");
    expect(modal).toBeInTheDocument();
  });

  it("renders centered modal on desktop", () => {
    mockIsMobile = false;
    render(<GlobalSearch />);
    fireEvent.keyDown(window, { key: "k", ctrlKey: true });

    const modal = screen.getByPlaceholderText(/search/i).closest("[class*='max-w-xl']");
    expect(modal).toBeInTheDocument();
  });
});
