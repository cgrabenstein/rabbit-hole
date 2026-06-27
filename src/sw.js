/// <reference lib="webworker" />
import { precacheAndRoute } from "workbox-precaching";

// Inject Workbox precache manifest (replaced at build time)
precacheAndRoute(self.__WB_MANIFEST);

// ── Web Share Target ──
// Intercept POST to /share-target and redirect the shared URL to the app
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  if (event.request.method === "POST" && url.pathname === "/share-target") {
    event.respondWith(
      (async () => {
        try {
          const formData = await event.request.formData();
          // Some apps send the URL as "url", others as "text"
          const sharedUrl =
            formData.get("url")?.toString().trim() ||
            formData.get("text")?.toString().trim();

          if (!sharedUrl || sharedUrl === "") {
            return Response.redirect("/", 303);
          }

          const redirectUrl = `/?shared_url=${encodeURIComponent(sharedUrl)}`;
          return Response.redirect(redirectUrl, 303);
        } catch {
          return Response.redirect("/", 303);
        }
      })()
    );
  }
});
