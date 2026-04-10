import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "../../../../test/utils/test-utils";
import { YearRangeSlider } from "@/components/searchpage/archive-sidebar/YearRangeSlider";

describe("YearRangeSlider component", () => {
    afterEach(() => {
        cleanup();
    });

    it("renders two range inputs with correct min, max, and values", () => {
        render(<YearRangeSlider min={2000} max={2020} value={[2005, 2015]} onChange={vi.fn()} />);

        const inputs = screen.getAllByRole("slider");
        expect(inputs).toHaveLength(2);
        expect(inputs[0]).toHaveAttribute("min", "2000");
        expect(inputs[0]).toHaveAttribute("max", "2020");
        expect(inputs[0]).toHaveValue("2005");
        expect(inputs[1]).toHaveAttribute("min", "2000");
        expect(inputs[1]).toHaveAttribute("max", "2020");
        expect(inputs[1]).toHaveValue("2015");
    });

    it("applies aria-labels to both thumbs", () => {
        render(
            <YearRangeSlider
                min={2000}
                max={2020}
                value={[2005, 2015]}
                onChange={vi.fn()}
                ariaLabelStart="Start year"
                ariaLabelEnd="End year"
            />
        );

        expect(screen.getByRole("slider", { name: "Start year" })).toBeInTheDocument();
        expect(screen.getByRole("slider", { name: "End year" })).toBeInTheDocument();
    });

    it("calls onChange with updated lo value when the start thumb changes", () => {
        const onChange = vi.fn();

        render(
            <YearRangeSlider
                min={2000}
                max={2020}
                value={[2005, 2015]}
                onChange={onChange}
                ariaLabelStart="Start year"
                ariaLabelEnd="End year"
            />
        );

        const startInput = screen.getByRole("slider", { name: "Start year" });
        fireEvent.change(startInput, { target: { value: "2006" } });

        expect(onChange).toHaveBeenCalledWith([2006, 2015]);
    });

    it("calls onChange with updated hi value when the end thumb changes", () => {
        const onChange = vi.fn();

        render(
            <YearRangeSlider
                min={2000}
                max={2020}
                value={[2005, 2015]}
                onChange={onChange}
                ariaLabelStart="Start year"
                ariaLabelEnd="End year"
            />
        );

        const endInput = screen.getByRole("slider", { name: "End year" });
        fireEvent.change(endInput, { target: { value: "2014" } });

        expect(onChange).toHaveBeenCalledWith([2005, 2014]);
    });

    it("clamps lo value to not exceed hi value", () => {
        const onChange = vi.fn();

        render(
            <YearRangeSlider
                min={2000}
                max={2020}
                value={[2015, 2015]}
                onChange={onChange}
                ariaLabelStart="Start year"
                ariaLabelEnd="End year"
            />
        );

        const startInput = screen.getByRole("slider", { name: "Start year" });
        // Try to move lo past hi — component clamps to Math.min(v, value[1])
        fireEvent.change(startInput, { target: { value: "2018" } });

        const [lo] = onChange.mock.calls[0][0] as [number, number];
        expect(lo).toBeLessThanOrEqual(2015);
    });

    it("clamps hi value to not go below lo value", () => {
        const onChange = vi.fn();

        render(
            <YearRangeSlider
                min={2000}
                max={2020}
                value={[2010, 2010]}
                onChange={onChange}
                ariaLabelStart="Start year"
                ariaLabelEnd="End year"
            />
        );

        const endInput = screen.getByRole("slider", { name: "End year" });
        // Try to move hi below lo — component clamps to Math.max(v, value[0])
        fireEvent.change(endInput, { target: { value: "2005" } });

        const [, hi] = onChange.mock.calls[0][0] as [number, number];
        expect(hi).toBeGreaterThanOrEqual(2010);
    });

    it("shows an error message when min equals max", () => {
        render(<YearRangeSlider min={2010} max={2010} value={[2010, 2010]} onChange={vi.fn()} />);

        expect(screen.getByText("Error: Invalid year range")).toBeInTheDocument();
        expect(screen.queryAllByRole("slider")).toHaveLength(0);
    });

    it("shows an error message when min is greater than max", () => {
        render(<YearRangeSlider min={2020} max={2000} value={[2000, 2020]} onChange={vi.fn()} />);

        expect(screen.getByText("Error: Invalid year range")).toBeInTheDocument();
    });

    // Helper to locate the overlay div — the container.firstChild is a theme script,
    // so we find the component root via the rendered sliders instead.
    function getOverlay() {
        const root = screen.getAllByRole("slider")[0].parentElement!;
        return {
            root,
            overlay: root.querySelector('[class*="inset-x-0"]') as HTMLElement,
        };
    }

    it("overlay pointer down does not throw", () => {
        render(<YearRangeSlider min={2000} max={2020} value={[2005, 2015]} onChange={vi.fn()} />);
        const { overlay } = getOverlay();
        overlay.setPointerCapture = vi.fn();
        overlay.releasePointerCapture = vi.fn();

        fireEvent.pointerDown(overlay, { clientX: 100, buttons: 1 });
        // No error thrown — drag state initialised (class loses pointer-events-none)
        expect(overlay.className).not.toContain("pointer-events-none");
    });

    it("overlay pointer move right calls onChange for hi thumb", () => {
        const onChange = vi.fn();
        render(<YearRangeSlider min={2000} max={2020} value={[2005, 2015]} onChange={onChange} />);
        const { root, overlay } = getOverlay();

        // Mock getBoundingClientRect on the component root so toValue computes a real year
        root.getBoundingClientRect = () => ({
            left: 0,
            width: 200,
            top: 0,
            bottom: 0,
            right: 200,
            height: 0,
            x: 0,
            y: 0,
            toJSON: () => ({}),
        });
        overlay.setPointerCapture = vi.fn();
        overlay.releasePointerCapture = vi.fn();

        fireEvent.pointerDown(overlay, { clientX: 100, buttons: 1 });
        // Move right >3px — thumb resolves to "hi"
        const moveRight = new PointerEvent("pointermove", {
            bubbles: true,
            cancelable: true,
            clientX: 114,
        });
        Object.defineProperty(moveRight, "buttons", { value: 1, configurable: true });
        fireEvent(overlay, moveRight);

        expect(onChange).toHaveBeenCalled();
    });

    it("overlay pointer move left calls onChange for lo thumb", () => {
        const onChange = vi.fn();
        render(<YearRangeSlider min={2000} max={2020} value={[2005, 2015]} onChange={onChange} />);
        const { root, overlay } = getOverlay();

        root.getBoundingClientRect = () => ({
            left: 0,
            width: 200,
            top: 0,
            bottom: 0,
            right: 200,
            height: 0,
            x: 0,
            y: 0,
            toJSON: () => ({}),
        });
        overlay.setPointerCapture = vi.fn();
        overlay.releasePointerCapture = vi.fn();

        fireEvent.pointerDown(overlay, { clientX: 100, buttons: 1 });
        // Move left >3px — thumb resolves to "lo"
        const moveLeft = new PointerEvent("pointermove", {
            bubbles: true,
            cancelable: true,
            clientX: 86,
        });
        Object.defineProperty(moveLeft, "buttons", { value: 1, configurable: true });
        fireEvent(overlay, moveLeft);

        expect(onChange).toHaveBeenCalled();
    });

    it("overlay pointer up clears drag state without error", () => {
        render(<YearRangeSlider min={2000} max={2020} value={[2005, 2015]} onChange={vi.fn()} />);
        const { overlay } = getOverlay();
        overlay.setPointerCapture = vi.fn();
        overlay.releasePointerCapture = vi.fn();

        fireEvent.pointerDown(overlay, { clientX: 100, buttons: 1 });
        fireEvent.pointerUp(overlay, { clientX: 100 });
        // No error — drag state cleaned up; class returns to pointer-events-none
        expect(overlay.className).toContain("pointer-events-none");
    });

    it("pointer move without prior pointerDown is a no-op", () => {
        const onChange = vi.fn();
        render(<YearRangeSlider min={2000} max={2020} value={[2005, 2015]} onChange={onChange} />);
        const { overlay } = getOverlay();

        fireEvent.pointerMove(overlay, { clientX: 100, buttons: 1 });

        expect(onChange).not.toHaveBeenCalled();
    });
});
