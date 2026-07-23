import { redirect } from "next/navigation";

/** Email OTP registration removed — send users back to register. */
export default function VerifyRegisterPage() {
  redirect("/register");
}
