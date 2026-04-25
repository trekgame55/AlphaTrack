"use client";

import { useWorkspace } from "@/lib/workspace-context";
import { redirect } from "next/navigation";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Projects are removed — this page redirects to tasks
export default function ProjectsPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/tasks");
  }, [router]);
  return null;
}
