import { useEffect } from "react";

export function usePageTitle(title?: string) {
  useEffect(() => {
    const prev = document.title;
    document.title = title ? `${title} | DevScope AI` : "DevScope AI";
    return () => {
      document.title = prev;
    };
  }, [title]);
}
