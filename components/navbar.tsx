"use client";

import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { useSession } from "@/lib/auth-client";

export function Navbar() {
  const { data: session } = useSession();

  return (
    <nav className="border-b bg-white">
      <div className="flex h-16 items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="size-5" />
          </Button>
          <h2 className="text-lg font-semibold">Project Management</h2>
        </div>

        <div className="flex items-center gap-4">
          {session?.user && (
            <div className="flex items-center gap-2">
              <div className="text-right">
                <p className="text-sm font-medium">{session.user.name}</p>
                <p className="text-xs text-muted-foreground">
                  {session.user.email}
                </p>
              </div>
              <div className="size-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                <span className="text-sm font-bold text-white">
                  {session.user.name?.charAt(0).toUpperCase() || "U"}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
