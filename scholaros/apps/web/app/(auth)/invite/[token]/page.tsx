"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { CheckCircle, Loader2, XCircle } from "lucide-react";
import Link from "next/link";
import { useAcceptInvite } from "@/lib/hooks/use-workspaces";
import { useWorkspaceStore } from "@/lib/stores/workspace-store";

export default function AcceptInvitePage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const acceptInvite = useAcceptInvite();
  const { setCurrentWorkspace } = useWorkspaceStore();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setError("Invalid invite link");
      return;
    }

    const accept = async () => {
      try {
        const result = await acceptInvite.mutateAsync(token);
        setCurrentWorkspace(result.workspace_id, result.role);
        setStatus("success");
        // Redirect after a short delay
        setTimeout(() => {
          router.push("/today");
        }, 2000);
      } catch (err) {
        setStatus("error");
        setError(err instanceof Error ? err.message : "Failed to accept invite");
      }
    };

    accept();
  }, [token]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md rounded-lg border bg-card p-8 text-center">
        {status === "loading" && (
          <>
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
            <h1 className="mt-4 text-xl font-semibold">Accepting Invite...</h1>
            <p className="mt-2 text-muted-foreground">
              Please wait while we add you to the workspace.
            </p>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
            <h1 className="mt-4 text-xl font-semibold">Welcome to the Workspace!</h1>
            <p className="mt-2 text-muted-foreground">
              You have successfully joined the workspace. Redirecting you now...
            </p>
            <Link
              href="/today"
              className="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Go to Dashboard
            </Link>
          </>
        )}

        {status === "error" && (
          <>
            <XCircle className="mx-auto h-12 w-12 text-red-500" />
            <h1 className="mt-4 text-xl font-semibold">Unable to Accept Invite</h1>
            <p className="mt-2 text-muted-foreground">
              {error || "The invite link may have expired or is invalid."}
            </p>
            <div className="mt-4 space-y-2">
              <Link
                href="/login"
                className="inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Go to Login
              </Link>
              <p className="text-sm text-muted-foreground">
                Need help?{" "}
                <a href="mailto:support@scholaros.app" className="text-primary hover:underline">
                  Contact support
                </a>
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
