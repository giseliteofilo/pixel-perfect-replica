import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/app/AppShell";
import { ActivitiesBrowser } from "@/components/app/ActivitiesBrowser";
import { useAppState } from "@/lib/store";

export const Route = createFileRoute("/atividades")({
  head: () => ({
    meta: [
      { title: "Todas as Atividades — Planejador de Estudos" },
      { name: "description", content: "Lista e quadro Kanban com filtros e ordenação." },
      { property: "og:title", content: "Todas as Atividades — Planejador de Estudos" },
      { property: "og:description", content: "Lista e quadro Kanban com filtros e ordenação." },
    ],
  }),
  component: () => {
    const { activities } = useAppState();
    return (
      <div>
        <PageHeader title="Todas as Atividades" subtitle={`${activities.length} atividade(s) · arraste no Kanban para mudar o status`} />
        <ActivitiesBrowser />
      </div>
    );
  },
});
