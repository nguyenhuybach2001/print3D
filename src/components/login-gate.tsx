"use client";

import { useState } from "react";
import { Lock, KeyRound, Eye, EyeOff, AlertCircle, ArrowRight, Loader2, Printer } from "lucide-react";

export function LoginGate() {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Không đăng nhập được.");
      window.location.reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không đăng nhập được.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login-page">
      <div className="absolute inset-0 bg-[radial-gradient(#e0e7ff_1px,transparent_1px)] [background-size:24px_24px] opacity-60 pointer-events-none" />

      <form className="login-card" onSubmit={submit}>
        <div className="flex items-center gap-3 mb-6">
          <div className="brand-mark">
            <Printer className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="eyebrow text-xs">B3D LAB · PRINT STUDIO</div>
            <div className="text-xs text-slate-500 font-medium">Hệ thống điều hành xưởng in</div>
          </div>
        </div>

        <h1>Đăng nhập quản trị</h1>
        <p className="login-description">
          Nhập mật khẩu quản trị để xem chỉ số kinh doanh, tồn kho và tiến độ in.
        </p>

        {error && (
          <div className="import-message" role="alert">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <label className="field-label">
          <span>Mật khẩu truy cập</span>
          <div className="relative flex items-center">
            <KeyRound className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type={showPassword ? "text" : "password"}
              autoFocus
              autoComplete="current-password"
              placeholder="Nhập mật khẩu quản trị..."
              className="!pl-10 !pr-10"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              className="absolute right-3 text-slate-400 hover:text-slate-600 transition-colors p-1"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </label>

        <button className="primary-button" disabled={busy || !password.trim()}>
          {busy ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Đang xác thực…</span>
            </>
          ) : (
            <>
              <Lock className="w-4 h-4" />
              <span>Đăng nhập hệ thống</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </>
          )}
        </button>

        <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
          <span>Phiên đăng nhập an toàn</span>
          <span className="flex items-center gap-1.5">
            <span className="status-dot-active" /> Máy chủ sẵn sàng
          </span>
        </div>
      </form>
    </main>
  );
}
