import { Suspense } from "react";

export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<p className="text-sm text-muted px-1 py-6">加载中…</p>}>
      {children}
    </Suspense>
  );
}
