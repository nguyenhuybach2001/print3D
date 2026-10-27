"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export function LogoutButton({ className = "" }: { className?: string }) {
  const router = useRouter();
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }
  return (
    <button
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:text-red-600 hover:border-red-200 hover:bg-red-50/50 transition-colors ${className}`}
      onClick={() => void logout()}
      title="Đăng xuất khỏi hệ thống"
    >
      <LogOut className="w-3.5 h-3.5" />
      <span>Đăng xuất</span>
    </button>
  );
}
