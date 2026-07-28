import Link from "next/link";
import { redirect } from "next/navigation";

/** Legacy route — employee portal is web for all devices now. */
export default function EmployeeDesktopBlockedPage() {
  redirect("/employee/login");
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <Link href="/employee/login" className="text-brand-600 underline">
        چوونەژوورەوەی کارمەند
      </Link>
    </main>
  );
}
