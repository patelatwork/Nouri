"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useAuthStore, useScreenTimeStore } from "@/lib/store";

export default function Providers({ children }) {
  const [mounted, setMounted] = useState(false);
  const hydrate = useAuthStore((s) => s.hydrate);
  const hydrateScreenTime = useScreenTimeStore((s) => s.hydrate);
  const queryClientRef = useRef(null);

  if (!queryClientRef.current) {
    queryClientRef.current = new QueryClient({
      defaultOptions: {
        queries: { staleTime: 60_000, retry: 1 },
      },
    });
  }

  useEffect(() => {
    hydrate();
    hydrateScreenTime();
    setMounted(true);
  }, [hydrate, hydrateScreenTime]);

  if (!mounted) {
    return <div style={{ minHeight: "100vh", background: "#0A0A0F" }} />;
  }

  return (
    <QueryClientProvider client={queryClientRef.current}>
      {children}
    </QueryClientProvider>
  );
}
