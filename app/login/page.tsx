"use client";

import { Lock, Loader2 } from "lucide-react";
import { useActionState } from "react";
import { login } from "./actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, null);

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <span className="mb-1 flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Lock className="size-4" />
          </span>
          <CardTitle>NFDA Dashboard</CardTitle>
          <p className="text-sm text-muted-foreground">Sign in to continue.</p>
        </CardHeader>
        <CardContent>
          <form action={action} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" autoComplete="username" placeholder="you@example.com" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" autoComplete="current-password" required />
            </div>
            {state?.error ? <p className="text-sm text-danger">{state.error}</p> : null}
            <Button type="submit" disabled={pending} className="w-full">
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              {pending ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
