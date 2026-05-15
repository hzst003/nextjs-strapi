"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function nextTheme(current: string | undefined) {
  if (current === "light") return "dark";
  if (current === "dark") return "system";
  return "light";
}

function themeLabel(current: string | undefined) {
  if (current === "light") return "浅色";
  if (current === "dark") return "深色";
  return "跟随系统";
}

export function ThemeToggle({ className }: { className?: string }) {
  const [mounted, setMounted] = React.useState(false);
  const { theme, setTheme } = useTheme();

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        className={cn("shrink-0", className)}
        aria-hidden
        disabled
      >
        <Sun className="size-4 opacity-0" />
      </Button>
    );
  }

  const Icon =
    theme === "light" ? Sun : theme === "dark" ? Moon : Monitor;

  return (
    <Button
      type="button"
      variant="outline"
      size="icon-sm"
      className={cn("shrink-0", className)}
      aria-label={`主题：${themeLabel(theme)}，点击切换`}
      title={`${themeLabel(theme)}（点击切换）`}
      onClick={() => setTheme(nextTheme(theme))}
    >
      <Icon className="size-4" />
    </Button>
  );
}
