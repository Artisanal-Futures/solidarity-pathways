"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "~/lib/utils";

type Props = {
  data: {
    id: string;
    name: string;
  }[];
} & React.HTMLAttributes<HTMLDivElement>;

export const MainNav = ({ data, className }: Props) => {
  const pathname = usePathname();

  const routes = data.map((route) => ({
    href: `/${route.id}`,
    label: route.name,
    active: pathname === `/${route.id}`,
  }));

  return (
    <nav
      className={cn("mx-6 flex items-center space-x-4 lg:space-x-6", className)}
    >
      {routes.map((route) => (
        <Link
          key={route.href}
          href={route.href}
          className={cn(
            "text-lg font-medium transition-colors hover:text-black lg:text-sm",
            route.active ? "text-black" : "text-neutral-500",
          )}
        >
          {route.label}
        </Link>
      ))}
    </nav>
  );
};
