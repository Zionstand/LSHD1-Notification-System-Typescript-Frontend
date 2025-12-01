"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DoctorDashboardPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard/clinical");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="mt-4 text-gray-600">
          Redirecting to Clinical Dashboard...
        </p>
      </div>
    </div>
  );
}
