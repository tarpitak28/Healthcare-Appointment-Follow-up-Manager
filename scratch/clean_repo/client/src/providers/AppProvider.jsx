import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';

// Initialize Enterprise React Query Client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10000, // 10 seconds stale time
      cacheTime: 5 * 60 * 1000, // 5 minutes cache retention
      refetchOnWindowFocus: true,
      retry: 2,
    },
  },
});

export default function AppProvider({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          {children}
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export { queryClient };
