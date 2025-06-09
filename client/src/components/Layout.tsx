import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Play, Home, Tv, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const { user } = useAuth();

  const navigation = [
    { name: "Home", href: "/", icon: Home, current: location === "/" },
    {
      name: "Channel",
      href: "/channel",
      icon: Tv,
      current: location === "/channel",
    },
    {
      name: "Account",
      href: "/account",
      icon: User,
      current: location === "/account",
    },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-16 bg-white border-r border-gray-200 fixed h-full z-10">
        <div className="p-3">
          {/* Logo */}
          <div className="flex items-center justify-center mb-8">
            <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
              <Play className="w-4 h-4 text-white" />
            </div>
          </div>

          {/* Navigation */}
          <nav className="space-y-2">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                title={item.name}
                className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-lg transition-colors",
                  item.current
                    ? "bg-gray-100 text-gray-900"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                )}
              >
                <item.icon
                  className={cn(
                    "w-5 h-5",
                    item.current ? "text-gray-600" : "text-gray-400",
                  )}
                />
              </Link>
            ))}
          </nav>
        </div>

        {/* User Profile */}
        <div className="absolute bottom-6 left-3">
          <div className="w-10 h-10 bg-gray-300 rounded-full overflow-hidden">
            {user?.profileImageUrl ? (
              <img
                src={user.profileImageUrl}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gray-300" />
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 ml-16">{children}</div>
    </div>
  );
}
