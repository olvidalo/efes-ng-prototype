import { Worker } from "node:worker_threads";
import { pathToFileURL } from "node:url";
import path from "node:path";

interface WorkerJob {
    job: any;
    resolve: (result: any) => void;
    reject: (error: Error) => void;
    recycleAfter?: boolean;
}

export class WorkerPool {
    private workers: Worker[] = [];
    private workerIds = new Map<Worker, number>();
    private queue: WorkerJob[] = [];
    private activeJobs = new Map<Worker, WorkerJob>();

    private terminated = false;

    constructor(
        poolSize: number,
        private workerPath: string,
        private onLog?: (nodeName: string, message: string) => void,
    ) {
        for (let i = 0; i < poolSize; i++) {
            this.spawnWorker(i);
        }
    }

    private spawnWorker(id: number): void {
        const workerUrl = path.isAbsolute(this.workerPath)
            ? pathToFileURL(this.workerPath)
            : new URL(this.workerPath, import.meta.url);
        const worker = new Worker(workerUrl, {
            execArgv: ['--experimental-strip-types']
        });

        this.workerIds.set(worker, id);

        worker.on("message", (message) => {
            if (message.type === 'log') {
                const job = this.activeJobs.get(worker);
                if (job && this.onLog) {
                    this.onLog(job.job.nodeName, message.message);
                }
                return;
            }

            const job = this.activeJobs.get(worker);
            if (!job) return;

            this.activeJobs.delete(worker);

            if (message.success) {
                job.resolve(message.result);
            } else {
                const error = new Error(message.error.message);
                error.stack = message.error.stack;
                job.reject(error);
            }

            if (job.recycleAfter) {
                // Terminate and respawn so module-level caches are cleared
                this.replaceWorker(worker);
            } else {
                this.processNext(worker);
            }
        });

        worker.on("error", (error) => {
            const id = this.workerIds.get(worker);
            const job = this.activeJobs.get(worker);
            if (job) {
                this.activeJobs.delete(worker);
                job.reject(error);
            }
            console.error(`Worker ${id} crashed, spawning replacement:`, error.message);
            this.replaceWorker(worker);
        });

        this.workers.push(worker);
    }

    execute<T>(job: any, opts?: { recycleAfter?: boolean }): Promise<T> {
        return new Promise((resolve, reject) => {
            const workerJob: WorkerJob = { job, resolve, reject, recycleAfter: opts?.recycleAfter };

            // Try to find an idle worker
            const idleWorker = this.workers.find(w => !this.activeJobs.has(w));

            if (idleWorker) {
                this.activeJobs.set(idleWorker, workerJob);
                idleWorker.postMessage(job);
            } else {
                // All workers busy, queue the job
                this.queue.push(workerJob);
            }
        });
    }

    private replaceWorker(worker: Worker) {
        const id = this.workerIds.get(worker) ?? this.workers.length;
        const idx = this.workers.indexOf(worker);
        if (idx !== -1) this.workers.splice(idx, 1);
        this.workerIds.delete(worker);
        worker.terminate();
        if (!this.terminated) {
            this.spawnWorker(id);
        }
    }

    private processNext(worker: Worker) {
        const nextJob = this.queue.shift();
        if (nextJob) {
            this.activeJobs.set(worker, nextJob);
            worker.postMessage(nextJob.job);
        }
    }

    getActiveWorkers(): Map<number, any> {
        const activeWorkers = new Map<number, any>();
        for (const [worker, job] of this.activeJobs.entries()) {
            const workerId = this.workerIds.get(worker)!;
            activeWorkers.set(workerId, job.job);
        }
        return activeWorkers;
    }

    async terminate() {
        this.terminated = true;
        // Reject queued jobs
        for (const job of this.queue) {
            job.reject(new Error('Worker pool terminated'));
        }
        this.queue = [];
        // Reject active jobs before killing workers
        for (const [, job] of this.activeJobs) {
            job.reject(new Error('Worker pool terminated'));
        }
        this.activeJobs.clear();
        // Kill workers
        await Promise.all(this.workers.map(w => w.terminate()));
        this.workers = [];
        this.workerIds.clear();
    }
}
