// components/auth/ProtectedRoute.tsx
// Client-side route protection based on roles and permissions

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import type { UserRole, Permission } from "@/lib/types/roles";
import { AlertCircle, Lock } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole[];
  requiredPermission?: Permission[];
  requireResourceAccess?: {
    type: "association" | "club";
    id: string;
  };
  fallback?: React.ReactNode;
  redirectTo?: string;
}

export function ProtectedRoute({
  children,
  requiredRole,
  requiredPermission,
  requireResourceAccess,
  fallback,
  redirectTo = "/login",
}: ProtectedRouteProps) {
  const { user, isLoading, isAuthenticated, hasPermission, canAccessResource } =
    useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push(redirectTo);
    }
  }, [isLoading, isAuthenticated, redirectTo, router]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#06054e] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg font-bold text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated || !user) {
    return fallback || null;
  }

  // Check role requirement
  if (requiredRole && !requiredRole.includes(user.role)) {
    return (
      <AccessDenied
        reason="insufficient-role"
        message={`This page requires one of the following roles: ${requiredRole.join(", ")}`}
        userRole={user.role}
      />
    );
  }

  // Check permission requirement
  if (requiredPermission) {
    const hasAllPermissions = requiredPermission.every((permission) =>
      hasPermission(permission)
    );

    if (!hasAllPermissions) {
      return (
        <AccessDenied
          reason="insufficient-permission"
          message="You don't have the required permissions to access this page"
          userRole={user.role}
        />
      );
    }
  }

  // Check resource access
  if (requireResourceAccess) {
    if (
      !canAccessResource(requireResourceAccess.type, requireResourceAccess.id)
    ) {
      return (
        <AccessDenied
          reason="resource-access"
          message={`You don't have access to this ${requireResourceAccess.type}`}
          userRole={user.role}
        />
      );
    }
  }

  // All checks passed
  return <>{children}</>;
}

function AccessDenied({
  reason,
  message,
  userRole,
}: {
  reason: "insufficient-role" | "insufficient-permission" | "resource-access";
  message: string;
  userRole: string;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-[2rem] shadow-xl border-4 border-red-500 p-8">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center flex-shrink-0">
              <Lock size={32} className="text-red-600" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-black text-red-800 uppercase mb-2">
                Access Denied
              </h1>
              <p className="text-lg text-red-700 font-bold">
                You don't have permission to access this page
              </p>
            </div>
          </div>

          <div className="bg-red-50 rounded-xl p-6 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle
                size={24}
                className="text-red-600 flex-shrink-0 mt-1"
              />
              <div>
                <p className="text-red-800 font-bold mb-2">{message}</p>
                <p className="text-sm text-red-600">
                  Your current role:{" "}
                  <span className="font-black">{userRole}</span>
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-black text-slate-700 uppercase text-sm">
              What you can do:
            </h3>
            <ul className="space-y-2 text-slate-600">
              <li className="flex items-start gap-2">
                <span className="text-[#06054e] font-bold">•</span>
                <span>
                  <strong>Contact your administrator</strong> if you believe you
                  should have access
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#06054e] font-bold">•</span>
                <span>
                  <strong>Request role change</strong> if you need additional
                  permissions
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#06054e] font-bold">•</span>
                <span>
                  <strong>Go back</strong> to a page you have access to
                </span>
              </li>
            </ul>
          </div>

          <div className="flex gap-4 mt-8">
            <button
              onClick={() => window.history.back()}
              className="flex-1 px-6 py-3 bg-slate-200 hover:bg-slate-300 rounded-xl font-bold transition-colors"
            >
              Go Back
            </button>
            <button
              onClick={() => (window.location.href = "/admin/dashboard")}
              className="flex-1 px-6 py-3 bg-[#06054e] text-white hover:bg-yellow-400 hover:text-[#06054e] rounded-xl font-bold transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
        </div>

        {/* Help Section */}
        <div className="mt-6 text-center">
          <p className="text-sm text-slate-500 font-bold">
            Need help? Contact support at{" "}
            <a
              href="mailto:support@hockeyapp.com"
              className="text-[#06054e] hover:underline"
            >
              support@hockeyapp.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

// Higher-order component for easy page wrapping
export function withAuth(
  Component: React.ComponentType,
  options: Omit<ProtectedRouteProps, "children">
) {
  return function ProtectedComponent(props: any) {
    return (
      <ProtectedRoute {...options}>
        <Component {...props} />
      </ProtectedRoute>
    );
  };
}
