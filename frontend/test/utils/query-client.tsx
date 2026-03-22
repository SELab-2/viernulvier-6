import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export const createTestQueryClient = () => {
    return new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
                staleTime: Infinity,
            },
            mutations: {
                retry: false,
            },
        },
    });
};

export const createQueryClientWrapper = () => {
    const queryClient = createTestQueryClient();

    const wrapper = ({ children }: { children: React.ReactNode }) => {
        return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    };

    return {
        queryClient,
        wrapper,
    };
};
