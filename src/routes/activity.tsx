import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { History } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { ActivityDetailDialog } from "#/components/activity/ActivityDetailDialog";
import { ActivityTable } from "#/components/activity/ActivityTable";
import { Button } from "#/components/ui/button";
import { GlowBg } from "#/components/ui/glow-bg";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "#/components/ui/pagination";
import { SectionLabel } from "#/components/ui/section-label";
import { toast } from "#/components/ui/sonner";
import {
  type ActivityDetail,
  type ActivityListResult,
  getActivityDetail,
  getActivityList,
  revertFileChange,
} from "#/lib/activity.functions";
import { getSession } from "#/lib/auth.functions";
import { plugins } from "#/plugins";

const activitySearchSchema = z.object({
  page: z.coerce.number().optional(),
  type: z.string().optional(),
  detail: z.string().optional(),
});

export const Route = createFileRoute("/activity")({
  validateSearch: activitySearchSchema,
  beforeLoad: async () => {
    const session = await getSession();
    if (!session) {
      throw redirect({ to: "/login" });
    }
  },
  loaderDeps: ({ search }) => ({
    page: search.page,
    type: search.type,
  }),
  loader: async ({ deps }) => {
    return await getActivityList({ data: deps });
  },
  component: ActivityPage,
});

const BASE_TYPE_FILTERS = [
  { value: "all", label: "All" },
  { value: "file_change", label: "File Changes" },
  { value: "cron_task", label: "Cron Tasks" },
  { value: "workflow", label: "Workflows" },
  { value: "system_task", label: "System Tasks" },
  { value: "ai_notification", label: "Notifications" },
];

function getTypeFilters() {
  const pluginFilters = plugins.flatMap((p) =>
    (p.activityTypes ?? []).map((at) => ({
      value: `plugin:${p.meta.id}:${at.type}`,
      label: at.label,
    })),
  );
  return [...BASE_TYPE_FILTERS, ...pluginFilters];
}

function ActivityPage() {
  const navigate = useNavigate({ from: Route.fullPath });
  const data = Route.useLoaderData() as ActivityListResult;
  const search = Route.useSearch();
  const activeType = search.type ?? "all";
  const detailId = search.detail;

  const [detailData, setDetailData] = useState<ActivityDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [reverting, setReverting] = useState(false);
  const loadedDetailRef = useRef<string | null>(null);

  async function openDetail(id: string) {
    setDetailLoading(true);
    loadedDetailRef.current = id;
    void navigate({ search: { ...search, detail: id }, replace: true });
    try {
      const result = await getActivityDetail({ data: { id } });
      setDetailData(result);
    } finally {
      setDetailLoading(false);
    }
  }

  function closeDetail() {
    setDetailData(null);
    loadedDetailRef.current = null;
    const { detail: _, ...rest } = search;
    void navigate({ search: rest, replace: true });
  }

  async function handleRevert(activityLogId: string) {
    setReverting(true);
    try {
      await revertFileChange({ data: { activityLogId } });
      toast.success("Change reverted");
      closeDetail();
    } catch (err) {
      toast.error("Revert failed", {
        description: err instanceof Error ? err.message : "Could not revert the change",
      });
    } finally {
      setReverting(false);
    }
  }

  // Auto-load detail if URL has detail param on mount/navigation
  useEffect(() => {
    if (detailId && detailId !== loadedDetailRef.current) {
      loadedDetailRef.current = detailId;
      setDetailLoading(true);
      getActivityDetail({ data: { id: detailId } })
        .then((result) => setDetailData(result))
        .finally(() => setDetailLoading(false));
    }
  }, [detailId]);

  return (
    <main className="relative overflow-hidden">
      <GlowBg color="var(--teal)" size="size-[500px]" position="-right-48 -top-48" />

      <div className="page-wrap relative px-4 pb-16 pt-10 sm:pt-12">
        <section className="mb-8">
          <SectionLabel icon={History} color="text-[var(--teal)]">
            Activity
          </SectionLabel>
          <h1 className="display-title mt-4 mb-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Activity <span className="text-[var(--teal)]">log</span>
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Track all file changes made by AI tools and manual edits.
          </p>
        </section>

        <section className="mb-4 flex gap-2">
          {getTypeFilters().map((filter) => (
            <Button
              key={filter.value}
              variant={activeType === filter.value ? "default" : "outline"}
              size="sm"
              onClick={() =>
                void navigate({
                  search: {
                    page: 1,
                    type: filter.value === "all" ? undefined : filter.value,
                  },
                  replace: true,
                })
              }
            >
              {filter.label}
            </Button>
          ))}
        </section>

        <ActivityTable items={data.items} onItemClick={(id) => void openDetail(id)} />

        {data.totalPages > 1 && (
          <section className="mt-4 flex justify-center">
            <Pagination>
              <PaginationContent>
                {data.page > 1 && (
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() =>
                        void navigate({
                          search: {
                            ...search,
                            page: data.page - 1,
                          },
                          replace: true,
                        })
                      }
                    />
                  </PaginationItem>
                )}
                {Array.from({ length: data.totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === data.totalPages || Math.abs(p - data.page) <= 2)
                  .map((p) => (
                    <PaginationItem key={p}>
                      <PaginationLink
                        isActive={p === data.page}
                        onClick={() =>
                          void navigate({
                            search: { ...search, page: p },
                            replace: true,
                          })
                        }
                      >
                        {p}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                {data.page < data.totalPages && (
                  <PaginationItem>
                    <PaginationNext
                      onClick={() =>
                        void navigate({
                          search: {
                            ...search,
                            page: data.page + 1,
                          },
                          replace: true,
                        })
                      }
                    />
                  </PaginationItem>
                )}
              </PaginationContent>
            </Pagination>
          </section>
        )}
      </div>

      <ActivityDetailDialog
        detail={detailData}
        loading={detailLoading}
        reverting={reverting}
        onClose={closeDetail}
        onRevert={(id) => void handleRevert(id)}
      />
    </main>
  );
}
