import AuthForm from "../../components/AuthForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Account - ScholarPulse AI Research Workspace",
  description: "Create your ScholarPulse account to organize academic research, citation graphs, and AI synthesis.",
};

export default function Register() {
  return (
    <main className="auth-page">
      <AuthForm mode="register" />
    </main>
  );
}