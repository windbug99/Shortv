import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import {
  Play,
  Home,
  TvMinimalPlay,
  CircleUser,
  Inbox,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const { user } = useAuth();

  const mainNavigation = [
    { name: "홈", href: "/", icon: Home, current: location === "/" },
    { name: "피드", href: "/feed", icon: Inbox, current: location === "/feed" },
    {
      name: "채널",
      href: "/channel",
      icon: TvMinimalPlay,
      current: location === "/channel",
    },
  ];

  const accountNavigation = {
    name: "계정",
    href: "/account",
    icon: CircleUser,
    current: location === "/account",
  };

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <div className="w-16 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 fixed h-full z-10 flex flex-col">
        <div className="p-3">
          {/* Logo */}
          <div className="flex items-center justify-center mb-8">
            <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
              <Play className="w-4 h-4 text-white" />
            </div>
          </div>
        </div>

        {/* Main Navigation - Centered */}
        <div className="flex-1 flex flex-col justify-center">
          <nav className="space-y-2 px-3">
            {mainNavigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                title={item.name}
                className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-lg transition-colors",
                  item.current
                    ? "bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-gray-100"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-100",
                )}
              >
                <item.icon
                  className={cn(
                    "w-5 h-5",
                    item.current ? "text-gray-600 dark:text-gray-300" : "text-gray-400 dark:text-gray-500",
                  )}
                />
              </Link>
            ))}
          </nav>
        </div>

        {/* Theme Toggle and Account Navigation - Bottom */}
        <div className="p-3 space-y-2">
          {/* Theme Toggle Button */}
          <div className="flex justify-center">
            <ThemeToggle />
          </div>
          
          {/* Account Link */}
          <Link
            href={accountNavigation.href}
            title={accountNavigation.name}
            className={cn(
              "flex items-center justify-center w-10 h-10 rounded-lg transition-colors",
              accountNavigation.current
                ? "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100",
            )}
          >
            <accountNavigation.icon
              className={cn(
                "w-5 h-5",
                accountNavigation.current ? "text-gray-600 dark:text-gray-300" : "text-gray-400 dark:text-gray-500",
              )}
            />
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 ml-16">{children}</div>
    </div>
  );
}
