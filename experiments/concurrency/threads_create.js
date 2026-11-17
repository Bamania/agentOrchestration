const { Worker, isMainThread, workerData } = require('node:worker_threads');

const ITERATIONS = 1_000_000;

if (isMainThread) {
	// 1. Allocate 4 bytes of shared memory (one 32-bit integer)
	const sharedBuffer = new SharedArrayBuffer(4);
	const sharedView = new Int32Array(sharedBuffer);
	sharedView[0] = 0; // shared counter starts at 0

	console.log(`Starting 2 threads, each adding ${ITERATIONS} to the counter...`);
	console.log(`Expected total: ${ITERATIONS * 2}`);

	// Helper to spawn a worker and return a Promise (like pthread_create + pthread_join)
	function createThread() {
		return new Promise((resolve, reject) => {
			const worker = new Worker(__filename, { workerData: { sharedBuffer } });

			worker.on('exit', (code) => {
				if (code === 0) resolve();
				else reject(new Error(`Worker stopped with exit code ${code}`));
			});
		});
	}

	// Launch both threads concurrently and wait for them to finish (pthread_join)
	Promise.all([createThread(), createThread()]).then(() => {
		console.log(`Actual result: ${sharedView[0]}`);
		console.log(`Difference: ${(ITERATIONS * 2) - sharedView[0]} increments lost!`);
	});
} else {
	// --- WORKER THREAD CODE ---
	const { sharedBuffer } = workerData;
	const sharedView = new Int32Array(sharedBuffer);

	// Critical section without mutual exclusion:
	// sharedView[0]++ is NOT atomic! It loads, increments, and stores.
	for (let i = 0; i < ITERATIONS; i++) {
		sharedView[0]++;
	}
}

