import { Suspense } from "react";
import { LoginForm } from "./login-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default function LoginPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Welcome back</CardTitle>
        <CardDescription>Sign in to your EstateFlow CRM</CardDescription>
      </CardHeader>
      <CardContent>
        <Suspense fallback={<div className="h-48 animate-pulse bg-muted rounded-md" />}>
          <LoginForm />
        </Suspense>
        <p className="mt-4 text-sm text-center text-muted-foreground">
          New here? <Link href="/signup" className="text-primary font-medium hover:underline">Create your workspace</Link>
        </p>
      </CardContent>
    </Card>
  );
}
