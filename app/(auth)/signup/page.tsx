import { SignupForm } from "./signup-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default function SignupPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Create your workspace</CardTitle>
        <CardDescription>Sign up as the admin of a new real estate org</CardDescription>
      </CardHeader>
      <CardContent>
        <SignupForm />
        <p className="mt-4 text-sm text-center text-muted-foreground">
          Already have an account? <Link href="/login" className="text-primary font-medium hover:underline">Sign in</Link>
        </p>
      </CardContent>
    </Card>
  );
}
