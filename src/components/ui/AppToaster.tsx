"use client";
import { useEffect, useState } from "react";
import { Toaster } from "sonner";

/** Toasts are dark on the public site; in the admin they follow the Light / Dark / Auto theme. */
export function AppToaster() {
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  useEffect(() => {
    const html = document.documentElement;
    const read = () => setTheme(html.dataset.adminResolved === "light" ? "light" : "dark");
    read();
    const mo = new MutationObserver(read);
    mo.observe(html, { attributes: true, attributeFilter: ["data-admin-resolved"] });
    return () => mo.disconnect();
  }, []);
  return <Toaster theme={theme} position="bottom-right" richColors closeButton />;
}
