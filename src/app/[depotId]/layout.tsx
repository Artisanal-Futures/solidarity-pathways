"use client";

import React from "react";
import { ClientProvider } from "~/providers/client";
import { DepotProvider } from "~/providers/depot";
import { DriverProvider } from "~/providers/driver";

export default function DepotLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DepotProvider>
      <DriverProvider>
        <ClientProvider>
          <>{children}</>
        </ClientProvider>
      </DriverProvider>
    </DepotProvider>
  );
}
