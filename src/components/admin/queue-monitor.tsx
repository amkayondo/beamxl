"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { cn } from "@/lib/utils";

type JobStatus = "waiting" | "active" | "completed" | "failed" | "delayed";

const JOB_STATUSES: JobStatus[] = [
  "waiting",
  "active",
  "completed",
  "failed",
  "delayed",
];

function formatQueueName(name: string) {
  return name
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatDate(date: string | Date | number) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function QueueMonitor() {
  const [selectedQueue, setSelectedQueue] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<JobStatus>("waiting");
  const [page, setPage] = useState(1);

  const { data: queueStats, isLoading: statsLoading } =
    api.systemAdmin.getQueueStats.useQuery(undefined, {
      refetchInterval: 5000,
    });

  const { data: jobsData, isLoading: jobsLoading } =
    api.systemAdmin.getQueueJobs.useQuery(
      {
        queueName: selectedQueue!,
        status: selectedStatus,
        page,
        limit: 20,
      },
      {
        enabled: selectedQueue != null,
        refetchInterval: 5000,
      },
    );

  const utils = api.useUtils();

  const retryJob = api.systemAdmin.retryJob.useMutation({
    onSuccess: () => {
      void utils.systemAdmin.getQueueStats.invalidate();
      void utils.systemAdmin.getQueueJobs.invalidate();
    },
  });

  function handleSelectQueue(queueName: string) {
    setSelectedQueue(queueName);
    setSelectedStatus("waiting");
    setPage(1);
  }

  function handleSelectStatus(status: JobStatus) {
    setSelectedStatus(status);
    setPage(1);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">
          Job Queues
        </h2>
        <p className="text-sm text-muted-foreground">
          Monitor background job queues and retry failed jobs
        </p>
      </div>

      {/* Queue Summary Grid */}
      {statsLoading ? (
        <div className="py-8 text-center text-muted-foreground">
          Loading queue stats...
        </div>
      ) : !queueStats?.length ? (
        <div className="py-8 text-center text-muted-foreground">
          No queues found
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {queueStats.map((queue) => (
            <button
              key={queue.name}
              onClick={() => handleSelectQueue(queue.name)}
              className={cn(
                "rounded-lg border border-border bg-card p-4 text-left transition-all hover:border-primary/50 hover:shadow-sm",
                selectedQueue === queue.name &&
                  "border-primary ring-1 ring-primary",
              )}
            >
              <p className="text-sm font-semibold text-foreground">
                {formatQueueName(queue.name)}
              </p>
              <div className="mt-3 grid grid-cols-5 gap-1 text-center">
                <div>
                  <p className="text-xs text-muted-foreground">Wait</p>
                  <p className="text-sm font-medium text-foreground">
                    {queue.waiting}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Act</p>
                  <p className="text-sm font-medium text-foreground">
                    {queue.active}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Done</p>
                  <p className="text-sm font-medium text-foreground">
                    {queue.completed}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Fail</p>
                  <p
                    className={cn(
                      "text-sm font-medium",
                      queue.failed > 0 ? "text-red-500" : "text-foreground",
                    )}
                  >
                    {queue.failed}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Del</p>
                  <p className="text-sm font-medium text-foreground">
                    {queue.delayed}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Job Detail Section */}
      {selectedQueue && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-foreground">
              {formatQueueName(selectedQueue)} &mdash; Jobs
            </h3>
            <button
              onClick={() => setSelectedQueue(null)}
              className="rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              Close
            </button>
          </div>

          {/* Status Tabs */}
          <div className="flex gap-1 rounded-lg border border-border bg-muted/30 p-1">
            {JOB_STATUSES.map((status) => (
              <button
                key={status}
                onClick={() => handleSelectStatus(status)}
                className={cn(
                  "rounded-md px-4 py-1.5 text-sm font-medium capitalize transition-colors",
                  selectedStatus === status
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {status}
              </button>
            ))}
          </div>

          {/* Jobs Table */}
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Job ID
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Attempts
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Created At
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Processed At
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Finished At
                  </th>
                  {selectedStatus === "failed" && (
                    <>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                        Failed Reason
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                        Actions
                      </th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {jobsLoading ? (
                  <tr>
                    <td
                      colSpan={selectedStatus === "failed" ? 9 : 7}
                      className="px-4 py-8 text-center text-muted-foreground"
                    >
                      Loading jobs...
                    </td>
                  </tr>
                ) : !jobsData?.items.length ? (
                  <tr>
                    <td
                      colSpan={selectedStatus === "failed" ? 9 : 7}
                      className="px-4 py-8 text-center text-muted-foreground"
                    >
                      No {selectedStatus} jobs found
                    </td>
                  </tr>
                ) : (
                  jobsData.items.map((job) => (
                    <tr
                      key={job.id}
                      className="border-b border-border last:border-b-0 transition-colors hover:bg-muted/30"
                    >
                      <td className="px-4 py-3 font-mono text-xs text-foreground">
                        {job.id}
                      </td>
                      <td className="px-4 py-3 text-foreground">{job.name}</td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
                            selectedStatus === "completed" &&
                              "bg-green-100 text-green-800",
                            selectedStatus === "failed" &&
                              "bg-red-100 text-red-800",
                            selectedStatus === "active" &&
                              "bg-blue-100 text-blue-800",
                            selectedStatus === "waiting" &&
                              "bg-yellow-100 text-yellow-800",
                            selectedStatus === "delayed" &&
                              "bg-orange-100 text-orange-800",
                          )}
                        >
                          {selectedStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-foreground">
                        {job.attemptsMade}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDate(job.timestamp)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {job.processedOn
                          ? formatDate(job.processedOn)
                          : "\u2014"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {job.finishedOn
                          ? formatDate(job.finishedOn)
                          : "\u2014"}
                      </td>
                      {selectedStatus === "failed" && (
                        <>
                          <td
                            className="max-w-[200px] truncate px-4 py-3 text-xs text-red-500"
                            title={job.failedReason ?? undefined}
                          >
                            {job.failedReason ?? "\u2014"}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() =>
                                retryJob.mutate({
                                  queueName: selectedQueue,
                                  jobId: job.id ?? "",
                                })
                              }
                              disabled={retryJob.isPending}
                              className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {retryJob.isPending ? "Retrying..." : "Retry"}
                            </button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {jobsData && jobsData.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing page {jobsData.page} of {jobsData.totalPages} (
                {jobsData.total} total jobs)
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= (jobsData?.totalPages ?? 1)}
                  className="rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
