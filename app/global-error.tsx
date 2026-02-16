"use client";

import Link from "next/link";
import { AlertOctagon, RotateCcw, RefreshCw, Home } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body className="bg-[#fafafa] text-[#0a0a0a] dark:bg-[#0a0a0a] dark:text-[#fafafa]">
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="max-w-lg w-full text-center">
            {/* Icon */}
            <div className="mx-auto mb-8 w-24 h-24 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
              <AlertOctagon className="w-12 h-12 text-red-600 dark:text-red-400" />
            </div>

            {/* Error Text */}
            <h1 className="text-2xl font-semibold mb-3">Critical Error</h1>
            <p className="text-[#737373] dark:text-[#a3a3a3] mb-4 max-w-md mx-auto">
              A critical error occurred that prevented the page from loading.
            </p>

            {/* Error details */}
            <div className="rounded-lg bg-[#f5f5f5] dark:bg-[#171717] border border-[#e5e5e5] dark:border-[#262626] p-4 mb-6 text-left">
              <p className="text-xs font-mono text-[#525252] dark:text-[#a3a3a3] break-words">
                {error?.message || "Unknown error"}
              </p>
              {error?.digest && (
                <p className="text-xs font-mono text-[#737373] dark:text-[#525252] mt-2">
                  Error ID: {error.digest}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-3 justify-center">
              <button
                onClick={() => reset()}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#0a0a0a] dark:bg-[#fafafa] text-[#fafafa] dark:text-[#0a0a0a] font-medium text-sm hover:opacity-90 transition-opacity"
              >
                <RotateCcw className="w-4 h-4" />
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[#e5e5e5] dark:border-[#262626] bg-transparent font-medium text-sm hover:bg-[#f5f5f5] dark:hover:bg-[#171717] transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Reload Page
              </button>
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm text-[#525252] dark:text-[#a3a3a3] hover:text-[#0a0a0a] dark:hover:text-[#fafafa] transition-colors"
              >
                <Home className="w-4 h-4" />
                Go Home
              </Link>
            </div>

            {/* Help text */}
            <p className="mt-8 text-sm text-[#737373] dark:text-[#525252]">
              If this problem persists, please contact support.
            </p>
          </div>
        </div>
      </body>
    </html>
  );
}
