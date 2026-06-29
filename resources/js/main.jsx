import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { store } from './store';
import { AppRoutes } from './routes';
import '../css/app.css';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 1,
            staleTime: 1000 * 60 * 15,
            refetchOnWindowFocus: false,
        },
    },
});

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <Provider store={store}>
            <QueryClientProvider client={queryClient}>
                <BrowserRouter>
                    <AppRoutes />
                    <Toaster position="top-right" toastOptions={{ duration: 3500, style: { fontSize: 13, fontWeight: 600 } }} />
                </BrowserRouter>
            </QueryClientProvider>
        </Provider>
    </StrictMode>,
);
