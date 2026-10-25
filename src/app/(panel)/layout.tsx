import { AppShell } from "@/components/AppShell";
import { StoreProvider } from "@/components/StoreProvider";

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <StoreProvider>
      <AppShell>{children}</AppShell>
    </StoreProvider>
  );
}
