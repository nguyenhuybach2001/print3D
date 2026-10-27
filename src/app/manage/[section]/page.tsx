import { notFound } from "next/navigation";
import Link from "next/link";
import { WorkbookManager } from "@/components/workbook-manager";
import { workbookModules } from "@/lib/workbook-modules";
import { LogoutButton } from "@/components/logout-button";
import { ArrowLeft, ChevronRight, Database, Printer } from "lucide-react";
import { connection } from "next/server";
import { Suspense } from "react";

const titles: Record<string, string> = { reports: "Báo cáo kinh doanh" };

export default function ManagePage({ params }: { params: Promise<{ section: string }> }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-indigo-600 font-medium">
          Đang tải dữ liệu...
        </div>
      }
    >
      <ManagePageContent params={params} />
    </Suspense>
  );
}

async function ManagePageContent({ params }: { params: Promise<{ section: string }> }) {
  await connection();
  const { section } = await params;
  const spec = workbookModules[section] ?? null;
  if (!spec && !titles[section]) notFound();

  const title = spec?.title ?? titles[section] ?? "Dữ liệu";

  return (
    <main className="manage-page">
      <header className="manage-topbar">
        <div className="flex items-center gap-3">
          <Link href="/" className="brand flex items-center gap-2 !mb-0 !p-0">
            <div className="brand-mark !w-8 !h-8 !rounded-lg">
              <Printer className="w-4 h-4 text-white" />
            </div>
            <strong className="text-sm font-bold text-slate-800">B3D Lab</strong>
          </Link>
          <span className="text-slate-300">/</span>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <Database className="w-3.5 h-3.5 text-indigo-500" />
            <span>Quản trị dữ liệu</span>
            <ChevronRight className="w-3 h-3 text-slate-300" />
            <strong className="text-slate-900 font-semibold">{title}</strong>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50/50 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Quay về Dashboard</span>
          </Link>
          <LogoutButton />
        </div>
      </header>

      <WorkbookManager section={section} spec={spec} />
    </main>
  );
}
