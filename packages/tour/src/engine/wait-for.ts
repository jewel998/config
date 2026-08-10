import type { WaitForCondition } from "../types.js";

/**
 * Waits for a condition to be met, then resolves.
 * Uses MutationObserver for DOM conditions, event listeners for events.
 * Returns a cleanup function.
 */
export function waitForCondition(
  condition: WaitForCondition,
  getRoutePath: () => string,
  onResolved: () => void,
): () => void {
  switch (condition.type) {
    case "click":
      return waitForClick(condition.target, onResolved);
    case "element-visible":
      return waitForElementVisible(condition.selector, onResolved);
    case "element-hidden":
      return waitForElementHidden(condition.selector, onResolved);
    case "route-change":
      return waitForRouteChange(condition.path, getRoutePath, onResolved);
    case "event":
      return waitForEvent(condition.name, onResolved);
    case "delay":
      return waitForDelay(condition.ms, onResolved);
    case "form-submit":
      return waitForFormSubmit(condition.selector, onResolved);
    default:
      return () => {};
  }
}

function waitForClick(
  target: string | undefined,
  onResolved: () => void,
): () => void {
  const el = target ? document.querySelector(target) : document;
  if (!el) {
    onResolved();
    return () => {};
  }
  const handler = () => onResolved();
  el.addEventListener("click", handler, { once: true });
  return () => el.removeEventListener("click", handler);
}

function waitForElementVisible(
  selector: string,
  onResolved: () => void,
): () => void {
  // Check immediately
  if (document.querySelector(selector)) {
    onResolved();
    return () => {};
  }

  const observer = new MutationObserver(() => {
    if (document.querySelector(selector)) {
      observer.disconnect();
      onResolved();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
  return () => observer.disconnect();
}

function waitForElementHidden(
  selector: string,
  onResolved: () => void,
): () => void {
  // Check immediately
  if (!document.querySelector(selector)) {
    onResolved();
    return () => {};
  }

  const observer = new MutationObserver(() => {
    if (!document.querySelector(selector)) {
      observer.disconnect();
      onResolved();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
  return () => observer.disconnect();
}

function waitForRouteChange(
  path: string,
  getRoutePath: () => string,
  onResolved: () => void,
): () => void {
  // Check immediately
  if (getRoutePath().startsWith(path)) {
    onResolved();
    return () => {};
  }

  // Poll route changes (works with any router)
  const interval = setInterval(() => {
    if (getRoutePath().startsWith(path)) {
      clearInterval(interval);
      onResolved();
    }
  }, 100);
  return () => clearInterval(interval);
}

function waitForEvent(name: string, onResolved: () => void): () => void {
  const handler = () => onResolved();
  window.addEventListener(name, handler, { once: true });
  return () => window.removeEventListener(name, handler);
}

function waitForDelay(ms: number, onResolved: () => void): () => void {
  const timer = setTimeout(onResolved, ms);
  return () => clearTimeout(timer);
}

function waitForFormSubmit(
  selector: string | undefined,
  onResolved: () => void,
): () => void {
  const el = selector ? document.querySelector(selector) : document;
  if (!el) {
    onResolved();
    return () => {};
  }
  const handler = () => onResolved();
  el.addEventListener("submit", handler, { once: true });
  return () => el.removeEventListener("submit", handler);
}
