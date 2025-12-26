import { useEffect } from "react";

export const useFavicon = (faviconUrl?: string | null) => {
  useEffect(() => {
    if (typeof document === "undefined") return;

    const finalUrl =
      typeof faviconUrl === "string" && faviconUrl.trim().length > 0
        ? faviconUrl
        : "/favicon.png";

    const head = document.head || document.getElementsByTagName("head")[0];
    if (!head || !finalUrl) return;

    let link = head.querySelector<HTMLLinkElement>("link[rel='icon']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      head.appendChild(link);
    }

    link.href = finalUrl;
  }, [faviconUrl]);
};

