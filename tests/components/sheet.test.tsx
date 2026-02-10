import { render, screen, fireEvent } from "@testing-library/react";
import { Sheet } from "@/components/mobile/sheet";

describe("Sheet", () => {
  const onClose = jest.fn();

  beforeEach(() => {
    onClose.mockClear();
  });

  it("renders nothing when closed", () => {
    const { container } = render(
      <Sheet open={false} onClose={onClose} title="Test">
        <p>Content</p>
      </Sheet>
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders content when open", () => {
    render(
      <Sheet open={true} onClose={onClose} title="Filters">
        <p>Filter content</p>
      </Sheet>
    );
    expect(screen.getByText("Filters")).toBeInTheDocument();
    expect(screen.getByText("Filter content")).toBeInTheDocument();
  });

  it("renders drag handle", () => {
    const { container } = render(
      <Sheet open={true} onClose={onClose} title="Test">
        <p>Content</p>
      </Sheet>
    );
    // Drag handle is a small div with rounded-full class
    const handle = container.querySelector(".rounded-full");
    expect(handle).toBeInTheDocument();
  });

  it("calls onClose when backdrop is clicked", () => {
    const { container } = render(
      <Sheet open={true} onClose={onClose}>
        <p>Content</p>
      </Sheet>
    );
    // Click on backdrop (first child div with bg-black)
    const backdrop = container.querySelector(".bg-black\\/60");
    if (backdrop) fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when Escape is pressed", () => {
    render(
      <Sheet open={true} onClose={onClose} title="Test">
        <p>Content</p>
      </Sheet>
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when X button is clicked", () => {
    render(
      <Sheet open={true} onClose={onClose} title="Test">
        <p>Content</p>
      </Sheet>
    );
    // The close button contains the X icon
    const buttons = screen.getAllByRole("button");
    const closeButton = buttons.find((b) => b.querySelector("svg"));
    if (closeButton) fireEvent.click(closeButton);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("locks body scroll when open", () => {
    render(
      <Sheet open={true} onClose={onClose}>
        <p>Content</p>
      </Sheet>
    );
    expect(document.body.style.overflow).toBe("hidden");
  });

  it("restores body scroll when closed", () => {
    const { rerender } = render(
      <Sheet open={true} onClose={onClose}>
        <p>Content</p>
      </Sheet>
    );
    expect(document.body.style.overflow).toBe("hidden");

    rerender(
      <Sheet open={false} onClose={onClose}>
        <p>Content</p>
      </Sheet>
    );
    expect(document.body.style.overflow).toBe("");
  });
});
