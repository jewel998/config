import { Trans } from "@lingui/react/macro";
import { createFileRoute } from "@tanstack/react-router";
import { User } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/stores/auth-store";

const AccountPage = () => {
  const user = useAuthStore((s) => s.user);

  if (!user) {
    return null;
  }

  const initials = user.displayName
    ? user.displayName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "U";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          <Trans>Account</Trans>
        </h1>
        <p className="text-sm text-muted-foreground">
          <Trans>Your profile information from Google.</Trans>
        </p>
      </div>

      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle className="text-base">
            <Trans>Profile</Trans>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-6">
            <Avatar className="h-20 w-20">
              {user.photoURL && (
                <AvatarImage src={user.photoURL} alt={user.displayName ?? ""} />
              )}
              <AvatarFallback className="text-lg">{initials}</AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <p className="text-lg font-medium">
                {user.displayName ?? "User"}
              </p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                <Trans>Display Name</Trans>
              </p>
              <p className="mt-1 text-sm">
                {user.displayName ?? <Trans>Not set</Trans>}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                <Trans>Email</Trans>
              </p>
              <p className="mt-1 font-mono text-sm">{user.email}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                <Trans>User ID</Trans>
              </p>
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                {user.uid}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                <Trans>Account Created</Trans>
              </p>
              <p className="mt-1 font-mono text-sm">
                {user.metadata.creationTime
                  ? new Date(user.metadata.creationTime).toLocaleDateString()
                  : "—"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-xl border-destructive/30">
        <CardHeader>
          <CardTitle className="text-base text-destructive">
            <Trans>Danger Zone</Trans>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            <Trans>
              Account deletion is not yet available. Contact support if you need
              to delete your account.
            </Trans>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export const Route = createFileRoute("/account")({
  component: AccountPage,
});
