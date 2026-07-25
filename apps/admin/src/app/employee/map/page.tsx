import { redirect } from "next/navigation";

/** GPS map is admin-only — employees never see location UI */
export default function EmployeeMapPage() {
  redirect("/employee");
}
