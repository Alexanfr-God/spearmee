import { createFileRoute } from "@tanstack/react-router";
import { AuthProvider } from "@/hooks/useAuth";
import { AppShell } from "@/components/AppShell";
import "@/lib/i18n";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Spearmee — Find a partner for a serious relationship & family" },
      {
        name: "description",
        content:
          "Spearmee helps people who want serious relationships and children find compatible partners through Resonance matching.",
      },
      { property: "og:title", content: "Spearmee" },
      {
        property: "og:description",
        content: "Find a partner for a serious relationship & family.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}
