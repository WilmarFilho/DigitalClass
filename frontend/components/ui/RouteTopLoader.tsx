"use client";

import NextTopLoader from "nextjs-toploader";

export function RouteTopLoader() {
  return (
    <NextTopLoader
      color="#6D44CC"
      height={3}
      showSpinner={false}
      crawl
      easing="ease"
      speed={220}
      shadow="0 0 10px rgba(109, 68, 204, 0.45)"
      zIndex={1600}
    />
  );
}
