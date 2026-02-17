import { createWorkers } from "@/server/jobs/workers";

const workers = createWorkers();

for (const worker of workers) {
  worker.on("completed", (job) => {
    console.log(`[worker] completed ${job.id}`);
  });

  worker.on("failed", (job, error) => {
    console.error(`[worker] failed ${job?.id}: ${error.message}`);
  });
}

console.log(`[worker] BeamFlow workers running (${workers.length})`);
