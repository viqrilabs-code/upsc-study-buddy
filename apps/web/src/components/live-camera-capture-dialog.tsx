"use client";

import { Camera, LoaderCircle, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type LiveCameraCaptureDialogProps = {
  open: boolean;
  title: string;
  description: string;
  fileNamePrefix: string;
  capturedItemLabel: string;
  onCapture: (file: File) => void;
  onClose: () => void;
};

export function LiveCameraCaptureDialog({
  open,
  title,
  description,
  fileNamePrefix,
  capturedItemLabel,
  onCapture,
  onClose,
}: LiveCameraCaptureDialogProps) {
  const [cameraPending, setCameraPending] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [capturedCount, setCapturedCount] = useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  function stopCameraStream() {
    if (!streamRef.current) {
      return;
    }

    streamRef.current.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  async function capturePage() {
    const video = videoRef.current;

    if (!video || !video.videoWidth || !video.videoHeight) {
      setCameraError("Camera preview is still loading. Wait a second and capture again.");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext("2d");

    if (!context) {
      setCameraError("Unable to read the camera frame right now. Please try again.");
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", 0.92);
    });

    if (!blob) {
      setCameraError("The photo could not be captured. Please try again.");
      return;
    }

    const nextCount = capturedCount + 1;
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const file = new File([blob], `${fileNamePrefix}-${timestamp}-${nextCount}.jpg`, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });

    onCapture(file);
    setCapturedCount(nextCount);
    setCameraError("");
  }

  useEffect(() => {
    const videoElement = videoRef.current;

    if (!open) {
      stopCameraStream();

      if (videoElement) {
        videoElement.srcObject = null;
      }

      setCameraPending(false);
      setCameraError("");
      setCapturedCount(0);
      return;
    }

    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices ||
      typeof navigator.mediaDevices.getUserMedia !== "function"
    ) {
      setCameraError(
        "Live camera capture needs a supported browser with camera permission over HTTPS or localhost.",
      );
      return;
    }

    let cancelled = false;

    async function startCamera() {
      setCameraPending(true);
      setCameraError("");
      setCapturedCount(0);
      stopCameraStream();

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;

        if (videoElement) {
          videoElement.srcObject = stream;
          await videoElement.play();
        }
      } catch (error) {
        if (!cancelled) {
          setCameraError(
            error instanceof Error
              ? error.message
              : "Camera access could not be started. Check browser permission and try again.",
          );
        }
      } finally {
        if (!cancelled) {
          setCameraPending(false);
        }
      }
    }

    void startCamera();

    return () => {
      cancelled = true;
      stopCameraStream();

      if (videoElement) {
        videoElement.srcObject = null;
      }
    };
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#161311]/72 p-4 backdrop-blur-sm">
      <div className="glass-panel w-full max-w-3xl rounded-[2rem] p-5 md:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-lg font-semibold text-ink">
              <Camera size={20} />
              {title}
            </div>
            <p className="mt-2 text-sm leading-7 text-copy">{description}</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border-subtle bg-white/82 text-ink"
            aria-label="Close camera"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-5 overflow-hidden rounded-[1.6rem] border border-border-subtle bg-[#0f111d]">
          <video ref={videoRef} autoPlay playsInline muted className="aspect-[4/3] w-full object-cover" />
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-copy">
            {cameraPending
              ? "Opening camera preview..."
              : capturedCount > 0
                ? `${capturedCount} ${capturedItemLabel}${capturedCount === 1 ? "" : "s"} captured in this camera session.`
                : `No ${capturedItemLabel}s captured yet in this camera session.`}
          </div>

          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={onClose} className="button-secondary">
              Done
            </button>
            <button
              type="button"
              onClick={capturePage}
              className="button-primary"
              disabled={cameraPending}
            >
              {cameraPending ? <LoaderCircle className="animate-spin" size={18} /> : <Camera size={18} />}
              Capture {capturedItemLabel}
            </button>
          </div>
        </div>

        {cameraError ? (
          <div className="mt-4 rounded-[1.35rem] border border-rose/20 bg-rose/8 px-4 py-3 text-sm text-rose">
            {cameraError}
          </div>
        ) : null}
      </div>
    </div>
  );
}
