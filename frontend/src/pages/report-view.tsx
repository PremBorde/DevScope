/**
 * /report/view/:id — exact snapshot by analysis ID.
 * Permanent link — the data never changes regardless of future analyses.
 */
import { useParams, useLocation } from "wouter";
import {
  useGetReportById,
  getGetReportByIdQueryKey,
} from "@workspace/api-client-react";
import type { AnalysisResult } from "@workspace/api-client-react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Skeleton } from "@/components/ui/skeleton";
import PageTransition from "@/components/layout/PageTransition";
import { ReportHeader, ReportBody } from "./report";

function ReportSkeleton() {
  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-12 space-y-6">
      <Skeleton className="h-40 border-4 border-black rounded-none" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Skeleton className="h-56 border-4 border-black rounded-none" />
        <Skeleton className="h-56 border-4 border-black rounded-none" />
      </div>
      <Skeleton className="h-40 border-4 border-black rounded-none" />
    </div>
  );
}

export default function ReportView() {
  const params  = useParams<{ id: string }>();
  const id      = parseInt(params.id ?? "", 10);
  const [, setLocation] = useLocation();

  const { data, isLoading, error } = useGetReportById(id, {
    query: {
      enabled: !isNaN(id) && id > 0,
      retry: false,
      queryKey: getGetReportByIdQueryKey(id),
    },
  });

  const profile = data?.profile as { login: string; name?: string } | undefined;
  const username = profile?.login ?? "";
  const displayName = profile?.name ?? username;

  usePageTitle(
    data
      ? `${displayName} — Report #${id}`
      : `Report #${id}`
  );

  const snapshotUrl = typeof window !== "undefined"
    ? `${window.location.origin}/report/view/${id}`
    : `/report/view/${id}`;

  if (isNaN(id) || id <= 0) {
    return (
      <PageTransition>
        <div className="flex items-center justify-center min-h-[60vh] px-6">
          <div className="border-4 border-black bg-white p-12 shadow-[8px_8px_0_#000] text-center">
            <p className="text-4xl mb-4">⚠️</p>
            <h2 className="font-heading font-black text-2xl uppercase mb-4">Invalid Report ID</h2>
            <button onClick={() => setLocation("/")} className="border-2 border-black bg-primary px-6 py-3 font-bold uppercase shadow-[4px_4px_0_#000]">
              Go Home
            </button>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="w-full bg-background min-h-screen">

        {/* Sticky header */}
        <ReportHeader
          username={username}
          displayName={displayName}
          snapshotUrl={snapshotUrl}
          isLoading={isLoading}
        />

        {isLoading && <ReportSkeleton />}

        {error && !isLoading && (
          <div className="flex items-center justify-center min-h-[60vh] px-6">
            <div className="border-4 border-black bg-white p-12 shadow-[8px_8px_0_#000] text-center max-w-md w-full">
              <div className="border-4 border-black p-4 inline-block mb-6 shadow-[4px_4px_0_#000] text-3xl bg-yellow-300">
                🔍
              </div>
              <h2 className="font-heading font-black text-2xl uppercase mb-3">Report Not Found</h2>
              <p className="font-medium text-muted-foreground mb-8 text-sm">
                {(error as { message?: string })?.message ?? `Report #${id} does not exist.`}
              </p>
              <button
                onClick={() => setLocation("/")}
                className="border-2 border-black bg-white px-5 py-2.5 font-bold uppercase shadow-[4px_4px_0_#000] hover:shadow-[6px_6px_0_#000] hover:-translate-y-0.5 transition-all"
              >
                Go Home
              </button>
            </div>
          </div>
        )}

        {data && !isLoading && (
          <ReportBody
            data={data as unknown as AnalysisResult}
            shareUrl={snapshotUrl}
            snapshotId={id}
          />
        )}
      </div>
    </PageTransition>
  );
}
