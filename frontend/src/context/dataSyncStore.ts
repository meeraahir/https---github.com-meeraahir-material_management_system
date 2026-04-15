let refreshVersion = 0;
let refreshScheduled = false;
const refreshListeners = new Set<() => void>();

export function subscribeToRefresh(listener: () => void) {
  refreshListeners.add(listener);

  return () => {
    refreshListeners.delete(listener);
  };
}

export function getRefreshSnapshot() {
  return refreshVersion;
}

export function triggerAppRefresh() {
  if (refreshScheduled) {
    return;
  }

  refreshScheduled = true;

  queueMicrotask(() => {
    refreshScheduled = false;
    refreshVersion += 1;
    refreshListeners.forEach((listener) => listener());
  });
}
