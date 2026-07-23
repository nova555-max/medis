import { redirect } from "next/navigation";

/** Branches feature disabled — company does not use multi-branch. */
export default function BranchesPage() {
  redirect("/");
}
