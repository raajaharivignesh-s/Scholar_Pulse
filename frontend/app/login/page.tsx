import AuthForm from "../../components/AuthForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In - ScholarPulse AI Research Workspace",
  description: "Sign in to ScholarPulse to organize academic research, citation graphs, and AI synthesis.",
};

export default function Login() {
  return (
    <main className="auth-page">
      <AuthForm mode="login" />
    </main>
  );
}