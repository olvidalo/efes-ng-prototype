import { parentPort } from "node:worker_threads";
import { pathToFileURL } from "node:url";
import path from "node:path";

if (!parentPort) {
    throw new Error("genericWorker must be run as a worker thread");
}

parentPort.on("message", async (message) => {
    try {
        // Extract workload script path from job message
        if (!message.workloadScript) {
            throw new Error("Job message must include 'workloadScript' property");
        }

        // Dynamic import based on workload script specified in job
        // On Windows, absolute paths must be file:// URLs for ESM import()
        const scriptUrl = path.isAbsolute(message.workloadScript)
            ? pathToFileURL(message.workloadScript).href
            : message.workloadScript;
        const workloadModule = await import(scriptUrl);

        // All workloads must satisfy WorkloadModule (see runtimeHelpers.ts)
        if (typeof workloadModule.performWork !== 'function') {
            throw new Error(`Workload module ${message.workloadScript} must export a 'performWork' function`);
        }

        const log = (msg: string) => {
            parentPort!.postMessage({ type: 'log', message: msg });
        };

        const result = await workloadModule.performWork(message, log);
        parentPort!.postMessage({ type: 'result', success: true, result });
    } catch (error: any) {
        parentPort!.postMessage({
            type: 'result',
            success: false,
            error: {
                message: error.message,
                stack: error.stack
            }
        });
    }
});
