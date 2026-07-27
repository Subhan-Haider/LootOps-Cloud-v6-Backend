"use client";

import { Suspense } from "react";
import { PythonStudio } from "@/components/python-studio/PythonStudio";

export default function PythonStudioPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center text-slate-400">Loading Python Studio...</div>}>
      <PythonStudio />
    </Suspense>
  );
}
