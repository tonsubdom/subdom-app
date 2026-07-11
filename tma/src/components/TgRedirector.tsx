// /src/components/TgRedirector.tsx
import { useEffect } from "react";

const decodeTgParam = (param: string) => {
  return param
    .replace("--3A", ":")
    .replace("--2F", "/")
    .replace("--", "%")
    .replace("%5F", "_")
    .replace("%2D", "-")
    .replace("%2E", ".");
};

const parseTgParam = (param: string) => {
  const decoded = decodeTgParam(param);
  console.log("[TgRedirector] Decoded param:", decoded);

  const segments = decoded.split("__");
  const path = `/${segments.shift()}`;
  const queryParams = new URLSearchParams();

  for (let i = 0; i < segments.length; i += 2) {
    const key = segments[i];
    const value = segments[i + 1] || "";

    queryParams.append(key.replace("-", "&"), value);
  }

  return { path, queryParams };
};

export default function TgRedirector() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tgWebAppStartParam = params.get("tgWebAppStartParam");

    if (tgWebAppStartParam) {
      const { path, queryParams } = parseTgParam(tgWebAppStartParam);

      params.delete("tgWebAppStartParam");

      const queryString = decodeURIComponent(queryParams.toString());
      const newUrl = queryString ? `#${path}?${queryString}` : `#${path}`;

      if (sessionStorage.getItem("tgRedirected") === newUrl) return;
      sessionStorage.setItem("tgRedirected", newUrl);

      requestAnimationFrame(() => {
        window.location.hash = newUrl;
      });
    }
  }, []);

  return null;
}
