// Placeholder boundary for serialized image-processing jobs.
export function createJobQueue() {
  return { enqueue() { throw new Error('Processing jobs are not implemented in Phase 0.'); } };
}
