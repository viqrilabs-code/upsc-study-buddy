"use client";

import { LoaderCircle, Sparkles } from "lucide-react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { PlanId } from "@/lib/plans";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, callback: (response: Record<string, unknown>) => void) => void;
    };
  }
}

async function readResponsePayload(response: Response) {
  const raw = await response.text();

  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {
      message: raw,
    };
  }
}

async function loadRazorpayScript() {
  if (window.Razorpay) {
    return true;
  }

  return new Promise<boolean>((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export function PlanCheckoutButton({
  planId,
  label,
  className = "button-primary",
}: {
  planId: PlanId;
  label: string;
  className?: string;
}) {
  const { data: session } = useSession();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function handleCheckout() {
    if (!session?.user) {
      signIn("google", { callbackUrl: "/pricing" });
      return;
    }

    setPending(true);
    setError("");

    try {
      const scriptLoaded = await loadRazorpayScript();

      if (!scriptLoaded || !window.Razorpay) {
        throw new Error("Unable to load Razorpay checkout.");
      }

      const checkoutResponse = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ planId }),
      });
      const checkoutData = await readResponsePayload(checkoutResponse);

      if (!checkoutResponse.ok) {
        throw new Error(String(checkoutData.message || "Unable to create a Razorpay order."));
      }

      const razorpay = new window.Razorpay({
        ...checkoutData,
        handler: async (paymentResponse: Record<string, unknown>) => {
          try {
            const verifyResponse = await fetch("/api/billing/verify", {
              method: "POST",
              headers: {
                "content-type": "application/json",
              },
              body: JSON.stringify({
                planId,
                ...paymentResponse,
              }),
            });
            const verifyData = await readResponsePayload(verifyResponse);

            if (!verifyResponse.ok) {
              throw new Error(String(verifyData.message || "Payment verification failed."));
            }

            router.refresh();
            router.push("/app?billing=success");
          } catch (verificationError) {
            setError(
              verificationError instanceof Error
                ? verificationError.message
                : "Payment verification failed.",
            );
          }
        },
        modal: {
          ondismiss: () => {
            setPending(false);
          },
        },
      });

      razorpay.on("payment.failed", (response) => {
        const errorObject =
          response && typeof response.error === "object" && response.error
            ? (response.error as { description?: unknown })
            : null;
        const details =
          typeof errorObject?.description === "string" ? errorObject.description : "";
        setError(details || "Razorpay payment failed. Please try again.");
      });

      razorpay.open();
    } catch (checkoutError) {
      setError(
        checkoutError instanceof Error
          ? checkoutError.message
          : "Unable to start checkout right now.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-2">
      <button type="button" onClick={handleCheckout} className={className} disabled={pending}>
        {pending ? <LoaderCircle className="animate-spin" size={18} /> : <Sparkles size={18} />}
        {label}
      </button>
      {error ? <div className="text-sm text-rose">{error}</div> : null}
    </div>
  );
}
