'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import {
  asModelContext,
  buildWebMcpTools,
  readProductCards,
  registerWebMcpTools,
  type WithModelContext,
} from '@/lib/webmcp';

// How long a tool waits for a soft navigation to finish before handing control
// back to the agent anyway. get_visible_products reports the path it read, so
// a slow render degrades to "read again" rather than to data silently
// attributed to the wrong page.
const NAVIGATE_TIMEOUT_MS = 5000;
// The URL changing is NOT the page being ready: measured in a production build,
// a search's URL and h1 were in place with 0 product cards, and the 18 cards
// arrived ~250ms later. So after the URL, wait until <main> stops changing.
const QUIET_MS = 400;

/** Resolves once `root` has gone QUIET_MS without a DOM mutation, or at `deadline`. */
function settled(root: Node, deadline: number) {
  return new Promise<void>((resolve) => {
    const finish = () => {
      clearTimeout(quiet);
      clearTimeout(hard);
      observer.disconnect();
      resolve();
    };
    let quiet = setTimeout(finish, QUIET_MS);
    const hard = setTimeout(finish, Math.max(0, deadline - Date.now()));
    const observer = new MutationObserver(() => {
      clearTimeout(quiet);
      quiet = setTimeout(finish, QUIET_MS);
    });
    observer.observe(root, { childList: true, subtree: true, characterData: true });
  });
}

/**
 * Registers the WebMCP tools in lib/webmcp.ts for the life of the page. Mounted
 * once in app/layout.tsx, so it survives soft navigations and the tools stay
 * registered across every page.
 *
 * Renders nothing. Does nothing at all in a browser without
 * `document.modelContext` — which is every browser without the Chrome origin
 * trial or its flag (see lib/webmcp.ts).
 */
export function WebMcpTools() {
  const router = useRouter();
  // A ref, so a new router identity can never re-run the effect and trip
  // Chrome's duplicate-name error mid-session.
  const routerRef = useRef(router);
  useEffect(() => {
    routerRef.current = router;
  }, [router]);

  useEffect(() => {
    // `document.modelContext` first; `navigator.modelContext` only as a trailing
    // fallback, and `??` means it is not even READ when the first exists. Chrome
    // 150 deprecated the navigator alias and 151 logs a console warning on every
    // read of it (measured).
    //
    // Both are written out LITERALLY, on purpose. The first version passed
    // `document` and `navigator` into a helper that read `obj.modelContext`, and
    // the minifier inlined it to `e?.modelContext`. The production bundle then
    // contained neither `document.modelContext` nor `navigator.modelContext`,
    // and orank's scanner reported "no document.modelContext /
    // navigator.modelContext usage found" while the tools were registering fine
    // in Chromium. A cast is erased at build time, so this survives minification.
    const ctx =
      asModelContext((document as Document & WithModelContext).modelContext) ??
      asModelContext((navigator as Navigator & WithModelContext).modelContext);
    if (!ctx) return;

    const controller = new AbortController();
    const tools = buildWebMcpTools({
      navigate: async (path) => {
        routerRef.current.push(path);
        const deadline = Date.now() + NAVIGATE_TIMEOUT_MS;
        while (location.pathname + location.search !== path && Date.now() < deadline) {
          await new Promise((r) => setTimeout(r, 50));
        }
        await settled(document.querySelector('main') ?? document.body, deadline);
      },
      visibleProducts: () => readProductCards(document),
      currentPath: () => location.pathname + location.search,
    });

    registerWebMcpTools(ctx, tools, controller.signal).then(({ failed }) => {
      // Never silent (§1): a tool that failed to register is invisible to an
      // agent and to us alike unless something says so.
      for (const f of failed) console.warn(`[webmcp] ${f.name} did not register — ${f.error}`);
    });

    // Aborting unregisters every tool (measured in Chromium 151), which is what
    // lets React's development double-mount register them a second time.
    return () => controller.abort();
  }, []);

  return null;
}
