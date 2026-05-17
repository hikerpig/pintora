function pad2(value: number) {
  return String(value).padStart(2, '0')
}

export function slugifyTraceTask(task: string) {
  const slug = task
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return slug || 'run'
}

export function buildTraceRunId(task: string, now = new Date()) {
  const stamp = [
    now.getUTCFullYear(),
    pad2(now.getUTCMonth() + 1),
    pad2(now.getUTCDate()),
    '-',
    pad2(now.getUTCHours()),
    pad2(now.getUTCMinutes()),
    pad2(now.getUTCSeconds()),
  ].join('')

  return `${stamp}-${slugifyTraceTask(task)}`
}
