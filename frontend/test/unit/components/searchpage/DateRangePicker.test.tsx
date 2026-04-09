import { describe, expect, it, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup } from "../../../../test/utils/test-utils";
import userEvent from "@testing-library/user-event";
import { DateRangePicker } from "@/components/searchpage/archive-sidebar/DateRangePicker";
import { NextIntlClientProvider } from "next-intl";

const messages = {
    Sidebar: {
        year: {
            startYear: "Start year",
            endYear: "End year",
            monthsShort: [
                "Jan",
                "Feb",
                "Mar",
                "Apr",
                "May",
                "Jun",
                "Jul",
                "Aug",
                "Sep",
                "Oct",
                "Nov",
                "Dec",
            ],
            monthsLong: [
                "January",
                "February",
                "March",
                "April",
                "May",
                "June",
                "July",
                "August",
                "September",
                "October",
                "November",
                "December",
            ],
            weekdays: ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"],
        },
    },
};

const renderWithIntl = (ui: React.ReactElement) => {
    return render(
        <NextIntlClientProvider locale="en" messages={messages}>
            {ui}
        </NextIntlClientProvider>
    );
};

const defaultProps = {
    startDate: new Date(2020, 2, 15), // 15 Mar 2020
    endDate: new Date(2022, 8, 10), // 10 Sep 2022
    minDate: new Date(2000, 0, 1), // 1 Jan 2000
    maxDate: new Date(2024, 11, 31), // 31 Dec 2024
    onChange: vi.fn(),
};

// jsdom does not implement scrollIntoView
beforeEach(() => {
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
});

describe("DateRangePicker component", () => {
    afterEach(() => {
        cleanup();
        vi.clearAllMocks();
    });

    it("renders formatted start and end date buttons", () => {
        renderWithIntl(<DateRangePicker {...defaultProps} />);

        expect(screen.getByText("15 Mar 2020")).toBeInTheDocument();
        expect(screen.getByText("10 Sep 2022")).toBeInTheDocument();
    });

    it("does not show the picker panel on initial render", () => {
        renderWithIntl(<DateRangePicker {...defaultProps} />);

        expect(screen.queryByText("Start year")).not.toBeInTheDocument();
    });

    it("opens picker with 'Start year' header when clicking the start date button", async () => {
        const user = userEvent.setup();
        renderWithIntl(<DateRangePicker {...defaultProps} />);

        await user.click(screen.getByText("15 Mar 2020"));

        expect(screen.getByText("Start year")).toBeInTheDocument();
    });

    it("opens picker with 'End year' header when clicking the end date button", async () => {
        const user = userEvent.setup();
        renderWithIntl(<DateRangePicker {...defaultProps} />);

        await user.click(screen.getByText("10 Sep 2022"));

        expect(screen.getByText("End year")).toBeInTheDocument();
    });

    it("shows a year grid when the picker opens", async () => {
        const user = userEvent.setup();
        renderWithIntl(<DateRangePicker {...defaultProps} />);

        await user.click(screen.getByText("15 Mar 2020"));

        expect(screen.getByRole("button", { name: "2020" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "2021" })).toBeInTheDocument();
    });

    it("transitions to month view after selecting a year", async () => {
        const user = userEvent.setup();
        renderWithIntl(<DateRangePicker {...defaultProps} />);

        await user.click(screen.getByText("15 Mar 2020"));
        await user.click(screen.getByRole("button", { name: "2021" }));

        expect(screen.getByText("Jan")).toBeInTheDocument();
        expect(screen.getByText("Dec")).toBeInTheDocument();
        expect(screen.getByText("2021")).toBeInTheDocument();
    });

    it("transitions to day view after selecting a month", async () => {
        const user = userEvent.setup();
        renderWithIntl(<DateRangePicker {...defaultProps} />);

        await user.click(screen.getByText("15 Mar 2020"));
        await user.click(screen.getByRole("button", { name: "2021" }));
        await user.click(screen.getByText("Jun"));

        expect(screen.getByText("June 2021")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "1" })).toBeInTheDocument();
    });

    it("back button navigates from day view to month view", async () => {
        const user = userEvent.setup();
        renderWithIntl(<DateRangePicker {...defaultProps} />);

        await user.click(screen.getByText("15 Mar 2020"));
        await user.click(screen.getByRole("button", { name: "2021" }));
        await user.click(screen.getByText("Jun"));

        expect(screen.getByText("June 2021")).toBeInTheDocument();

        // Back button has no text, only a ChevronLeft SVG — find by empty text content
        const allButtons = screen.getAllByRole("button");
        const backButton = allButtons.find(
            (btn) => btn.querySelector("svg") !== null && btn.textContent?.trim() === ""
        )!;
        await user.click(backButton);

        expect(screen.getByText("Jan")).toBeInTheDocument();
        expect(screen.queryByText("June 2021")).not.toBeInTheDocument();
    });

    it("back button navigates from month view to year view", async () => {
        const user = userEvent.setup();
        renderWithIntl(<DateRangePicker {...defaultProps} />);

        await user.click(screen.getByText("15 Mar 2020"));
        await user.click(screen.getByRole("button", { name: "2021" }));

        expect(screen.getByText("2021")).toBeInTheDocument();
        expect(screen.getByText("Jan")).toBeInTheDocument();

        // Back button has no text, only a ChevronLeft SVG — find by empty text content
        const allButtons = screen.getAllByRole("button");
        const backButton = allButtons.find(
            (btn) => btn.querySelector("svg") !== null && btn.textContent?.trim() === ""
        )!;
        await user.click(backButton);

        expect(screen.getByText("Start year")).toBeInTheDocument();
        expect(screen.queryByText("Jan")).not.toBeInTheDocument();
    });

    it("calls onChange and closes picker when a start day is selected", async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        renderWithIntl(<DateRangePicker {...defaultProps} onChange={onChange} />);

        await user.click(screen.getByText("15 Mar 2020"));
        await user.click(screen.getByRole("button", { name: "2021" }));
        await user.click(screen.getByText("Jun"));
        await user.click(screen.getByRole("button", { name: "1" }));

        expect(onChange).toHaveBeenCalledOnce();
        const [start] = onChange.mock.calls[0] as [Date, Date];
        expect(start.getFullYear()).toBe(2021);
        expect(start.getMonth()).toBe(5); // June = 5
        expect(start.getDate()).toBe(1);

        expect(screen.queryByText("Start year")).not.toBeInTheDocument();
    });

    it("calls onChange and closes picker when an end day is selected", async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        renderWithIntl(<DateRangePicker {...defaultProps} onChange={onChange} />);

        await user.click(screen.getByText("10 Sep 2022"));
        await user.click(screen.getByRole("button", { name: "2023" }));
        await user.click(screen.getByText("Mar"));
        await user.click(screen.getByRole("button", { name: "5" }));

        expect(onChange).toHaveBeenCalledOnce();
        const [, end] = onChange.mock.calls[0] as [Date, Date];
        expect(end.getFullYear()).toBe(2023);
        expect(end.getMonth()).toBe(2); // March = 2
        expect(end.getDate()).toBe(5);

        expect(screen.queryByText("End year")).not.toBeInTheDocument();
    });

    it("disables years before the start date when picking the end date", async () => {
        const user = userEvent.setup();
        renderWithIntl(<DateRangePicker {...defaultProps} />);

        await user.click(screen.getByText("10 Sep 2022"));

        const year2019 = screen.getByRole("button", { name: "2019" });
        expect(year2019).toBeDisabled();

        const year2023 = screen.getByRole("button", { name: "2023" });
        expect(year2023).not.toBeDisabled();
    });

    it("closes picker when clicking outside the component", async () => {
        const user = userEvent.setup();
        renderWithIntl(
            <div>
                <DateRangePicker {...defaultProps} />
                <button>Outside</button>
            </div>
        );

        await user.click(screen.getByText("15 Mar 2020"));
        expect(screen.getByText("Start year")).toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "Outside" }));
        expect(screen.queryByText("Start year")).not.toBeInTheDocument();
    });

    it("auto-advances to end picker when start date is picked after current end date", async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        // startDate=15 Mar 2020, endDate=10 Sep 2022 — pick a start date of Dec 15 2023 (after endDate)
        renderWithIntl(<DateRangePicker {...defaultProps} onChange={onChange} />);

        await user.click(screen.getByText("15 Mar 2020"));
        await user.click(screen.getByRole("button", { name: "2023" }));
        await user.click(screen.getByText("Dec"));
        await user.click(screen.getByRole("button", { name: "15" }));

        // onChange called with newEnd === selected (since selected > endDate)
        expect(onChange).toHaveBeenCalledOnce();
        const [start, end] = onChange.mock.calls[0] as [Date, Date];
        expect(start.getFullYear()).toBe(2023);
        expect(start.getMonth()).toBe(11); // December
        expect(start.getDate()).toBe(15);
        expect(end).toEqual(start);

        // Picker stays open and switches to End year header
        expect(screen.getByText("End year")).toBeInTheDocument();
    });
});
