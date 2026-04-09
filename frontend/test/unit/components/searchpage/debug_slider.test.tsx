import { describe, it, vi } from "vitest";
import { render, screen, fireEvent } from "../../../../test/utils/test-utils";
import { YearRangeSlider } from "@/components/searchpage/archive-sidebar/YearRangeSlider";

describe("debug", () => {
    it("finds overlay and tests pointerDown + move", () => {
        const onChange = vi.fn();
        const { container } = render(
            <YearRangeSlider min={2000} max={2020} value={[2005, 2015]} onChange={onChange} />
        );

        // The sliders' parent is the component root
        const sliders = screen.getAllByRole("slider");
        const root = sliders[0].parentElement!;
        console.log("root nodeName:", root.nodeName, "class:", root.className);
        root.childNodes.forEach((n, i) => {
            console.log(`  child[${i}]: nodeName=${n.nodeName}, class=${ (n as HTMLElement).className}`);
        });

        // Find overlay: the div inside root that has 'inset-x-0' in class
        const overlay = root.querySelector('[class*="inset-x-0"]') as HTMLElement;
        console.log("overlay:", overlay?.nodeName, overlay?.className);

        if (overlay) {
            overlay.setPointerCapture = vi.fn();
            overlay.releasePointerCapture = vi.fn();
            root.getBoundingClientRect = () => ({ left: 0, width: 200, top: 0, bottom: 0, right: 200, height: 0, x: 0, y: 0, toJSON: () => ({}) });

            fireEvent.pointerDown(overlay, { clientX: 100, buttons: 1 });
            console.log("After pointerDown — overlay class:", overlay.className);

            const moveEvent = new PointerEvent("pointermove", { bubbles: true, cancelable: true, clientX: 114 });
            Object.defineProperty(moveEvent, "buttons", { value: 1, configurable: true });
            fireEvent(overlay, moveEvent);

            console.log("onChange called:", onChange.mock.calls.length);
        }
    });
});
