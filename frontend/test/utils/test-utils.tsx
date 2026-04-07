import React, { ReactElement } from "react";
import { render, RenderOptions } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { QueryClientProvider } from "@tanstack/react-query";
import { createTestQueryClient } from "./query-client";
import { ThemeProvider } from "@/providers/ThemeProvider";

const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
    const queryClient = createTestQueryClient();
    return (
        <NextIntlClientProvider locale="en" messages={{}}>
            <QueryClientProvider client={queryClient}>
                <ThemeProvider>{children}</ThemeProvider>
            </QueryClientProvider>
        </NextIntlClientProvider>
    );
};

const customRender = (ui: ReactElement, options?: Omit<RenderOptions, "wrapper">) =>
    render(ui, { wrapper: AllTheProviders, ...options });

export * from "@testing-library/react";
export { customRender as render };
