"use client";

import { useEffect } from "react";
import {
  REDIRECTABLE_HOSTS,
  getClientPrimaryAppOrigin,
  getHostFromOrigin,
} from "@/lib/host-routing";

export function HostRedirector() {
  useEffect(() => {
    const { host, pathname, search, hash } = window.location;
    const primaryOrigin = getClientPrimaryAppOrigin();
    const primaryHost = getHostFromOrigin(primaryOrigin);

    if (!REDIRECTABLE_HOSTS.has(host) || host === primaryHost) {
      return;
    }

    const target = `${primaryOrigin}${pathname}${search}${hash}`;
    window.location.replace(target);
  }, []);

  return null;
}
