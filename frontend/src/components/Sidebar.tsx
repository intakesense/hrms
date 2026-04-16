import { useState } from "react";
import { Sidebar, SidebarBody, SidebarLink } from "./ui/sidebar";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Megaphone,
  LogOut,
  FileText,
  Receipt,
  DollarSign,
  MessageCircle,
  Shield,
  Settings
} from "lucide-react";
import Avatar from "./ui/avatarIcon";
import { cn } from "@/lib/utils";
import { useNavigate, Navigate, useLocation } from "react-router-dom";
import useAuth from "../hooks/authjwt";
import { Outlet } from "react-router-dom";

interface User {
  name?: string;
  email?: string;
  role?: string;
}

interface LinkItem {
  label: string;
  href?: string;
  onClick?: () => void;
  icon: React.ReactNode;
}

export default function SidebarDemo() {
  // All hooks must be called at the top level, before any conditional returns.
  const location = useLocation();
  const navigate = useNavigate();
  const userObject = useAuth() as User | null;
  const [open, setOpen] = useState(false);

  const token = localStorage.getItem("authToken");
  if (!token) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  // If token exists but user is not yet resolved, or token was invalid and cleared by useAuth
  // wait for user object to be populated or for token to be removed triggering above redirect.
  if (!userObject) {
    // Re-check token after useAuth has processed it (in case it was removed due to expiration)
    const currentToken = localStorage.getItem("authToken");
    if (!currentToken) {
      return <Navigate to="/auth/login" state={{ from: location }} replace />;
    }
    // Show loading spinner while token is being validated
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent mx-auto"></div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Authenticating...</div>
        </div>
      </div>
    );
  }
  const user = userObject;

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    // Use setTimeout to ensure token is cleared before navigation
    setTimeout(() => {
      navigate("/");
    }, 0);
  };

  const iconClass = "h-5 w-5 shrink-0 text-sidebar-foreground transition-colors duration-200";

  const links: LinkItem[] = [
    {
      label: "Dashboard",
      href: "/dashboard",
      icon: <LayoutDashboard className={iconClass} />,
    },
    // HR/admin links
    ...(() => {
      try {
        if (user && (user.role === "hr" || user.role === "admin")) {
          return [
            {
              label: "Employees",
              href: "/employees",
              icon: <Users className={iconClass} />,
            },
            {
              label: "Requests",
              href: "/admin/requests",
              icon: <FileText className={iconClass} />,
            },
            {
              label: "Expenses",
              href: "/admin/expenses",
              icon: <Receipt className={iconClass} />,
            },
            {
              label: "Holidays",
              href: "/holidays",
              icon: <CalendarDays className={iconClass} />,
            },
            {
              label: "Announcements",
              href: "/announcements",
              icon: <Megaphone className={iconClass} />,
            },
            {
              label: "Policies",
              href: "/policies",
              icon: <Shield className={iconClass} />,
            },
            {
              label: "Task Reports",
              href: "/task-reports",
              icon: <FileText className={iconClass} />,
            },
            {
              label: "Salary",
              href: "/salary",
              icon: <DollarSign className={iconClass} />,
            },
            {
              label: "HR Buddy",
              href: "/chatbot",
              icon: <MessageCircle className={iconClass} />,
            },
            {
              label: "Settings",
              href: "/settings",
              icon: <Settings className={iconClass} />,
            },
          ] as LinkItem[];
        } else if (user && user.role === "employee") {
          return [
            {
              label: "Attendance",
              href: "/attendance/my",
              icon: <CalendarDays className={iconClass} />,
            },
            {
              label: "Task Reports",
              href: "/task-reports/my",
              icon: <FileText className={iconClass} />,
            },
            {
              label: "Salary Slips",
              href: "/salary-slips/my",
              icon: <Receipt className={iconClass} />,
            },
            {
              label: "Requests",
              href: "/requests",
              icon: <FileText className={iconClass} />,
            },
            {
              label: "Expenses",
              href: "/expenses/my",
              icon: <Receipt className={iconClass} />,
            },
            {
              label: "Holidays",
              href: "/holidays",
              icon: <CalendarDays className={iconClass} />,
            },
            {
              label: "Announcements",
              href: "/announcements",
              icon: <Megaphone className={iconClass} />,
            },
          ] as LinkItem[];
        }
      } catch (err) {
        console.error("Sidebar role check failed", err);
      }
      return [];
    })(),
    {
      label: "Logout",
      onClick: handleLogout,
      icon: <LogOut className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />,
    },
  ];

  return (
    <div
      className={cn(
        "mx-auto flex w-full flex-1 flex-col overflow-hidden rounded-md border border-neutral-200 bg-gray-100 md:flex-row dark:border-neutral-700 dark:bg-neutral-800",
        "h-screen",
      )}
    >
      <Sidebar open={open} setOpen={setOpen}>
        <SidebarBody className="justify-between gap-4 z-50 border-r-1">
          <div className="flex flex-1 flex-col overflow-x-hidden overflow-y-auto scrollbar-hide min-h-0">
            <div className="mt-4 flex flex-col gap-0.5">
              {links.map((link, idx) => (
                <SidebarLink key={idx} link={link} />
              ))}
            </div>
          </div>
          <div className="shrink-0 pt-2 border-t border-sidebar-border">
            <SidebarLink
              link={{
                label: user?.name || "User",
                href: "/profile",
                icon: <Avatar name={user?.name || "User"} />,
              }}
            />
          </div>
        </SidebarBody>
      </Sidebar>
      <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900 min-w-0 md:ml-[80px] transition-all duration-300">
        <Outlet />
      </div>
    </div>
  );
}

export const Logo = () => {
  return (
    <a
      href="/"
      className="relative z-20 flex items-center space-x-2 py-1 text-sm font-normal text-black dark:text-white"
    >
      <div className="h-5 w-6 shrink-0 rounded-tl-lg rounded-tr-sm rounded-br-lg rounded-bl-sm bg-black dark:bg-white" />
      <span className="font-medium whitespace-pre text-black dark:text-white">
        HRMS
      </span>
    </a>
  );
};

export const LogoIcon = () => {
  return (
    <a
      href="/"
      className="relative z-20 flex items-center space-x-2 py-1 text-sm font-normal text-black dark:text-white"
    >
      <div className="h-5 w-6 shrink-0 rounded-tl-lg rounded-tr-sm rounded-br-lg rounded-bl-sm bg-black dark:bg-white" />
    </a>
  );
};