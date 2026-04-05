"use client";
import { useRef, useState } from "react";
import Image from "next/image";
import { Upload, X, Loader2 } from "lucide-react";

interface Props {
  value?: string;
  currentUrl?: string;
  onChange?: (url: string) => void;
  onUploaded?: (url: string) => void;
  label?: string;
  accept?: string;
}

export function CloudinaryUpload({ value, currentUrl, onChange, onUploaded, label, accept }: Props) {
  const url = value ?? currentUrl ?? "";
  const setUrl = onChange ?? onUploaded ?? (() => {});
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  const fileAccept = accept ?? "image/*";
  const supportsVideo = fileAccept.includes("video");

  const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100 MB
  const MAX_IMAGE_SIZE = 10 * 1024 * 1024;  // 10 MB

  async function handleFile(file: File) {
    setUploading(true);
    setError("");

    const isVideo = file.type.startsWith("video/");
    const limit = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
    if (file.size > limit) {
      setError(`File too large. Max ${isVideo ? "100 MB" : "10 MB"} allowed.`);
      setUploading(false);
      return;
    }
    try {
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
      if (!cloudName || !uploadPreset) {
        setError("Cloudinary not configured");
        return;
      }
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", uploadPreset);

      const resourceType = file.type.startsWith("video/") ? "video" : "image";
      const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;

      const data = await new Promise<{ secure_url?: string; error?: { message?: string } }>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", uploadUrl);

        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            setProgress(Math.round((e.loaded / e.total) * 100));
          }
        });

        xhr.addEventListener("load", () => {
          try {
            resolve(JSON.parse(xhr.responseText));
          } catch {
            reject(new Error("Invalid response"));
          }
        });

        xhr.addEventListener("error", () => reject(new Error("Upload error")));
        xhr.send(formData);
      });

      if (data.secure_url) {
        setUrl(data.secure_url);
      } else {
        setError(data.error?.message ?? "Upload failed");
      }
    } catch {
      setError("Upload error");
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }

  return (
    <div>
      {label && <label className="block font-body text-xs text-muted mb-1">{label}</label>}
      <div className="flex gap-2">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder={supportsVideo ? "https://… or upload image/video" : "https://… or upload an image"}
          className="flex-1 h-11 px-3 rounded-[8px] bg-white border border-gray-200 text-agro-dark font-body text-sm focus:outline-none focus:border-primary transition-colors"
        />
        <input
          ref={inputRef}
          type="file"
          accept={fileAccept}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          title={supportsVideo ? "Upload image or video" : "Upload image"}
          className="h-11 w-11 flex items-center justify-center rounded-[8px] border border-gray-200 text-muted hover:text-agro-dark hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
        </button>
        {url && (
          <button
            type="button"
            onClick={() => setUrl("")}
            title="Clear"
            className="h-11 w-11 flex items-center justify-center rounded-[8px] border border-gray-200 text-muted hover:text-status-cancelled hover:bg-red-50 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      {uploading && (
        <div className="mt-2">
          <div className="flex items-center justify-between mb-1">
            <span className="font-body text-xs text-muted">Uploading…</span>
            <span className="font-body text-xs text-muted">{progress}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
      {url && !url.includes("video") && (
        <div className="mt-2 h-16 w-24 rounded-[6px] overflow-hidden border border-gray-200 bg-gray-50">
          <Image src={url} alt="Preview" width={96} height={64} className="h-full w-full object-cover" />
        </div>
      )}
      {url && url.includes("video") && (
        <div className="mt-2 rounded-[6px] overflow-hidden border border-gray-200 bg-gray-50">
          <video src={url} className="h-16 w-24 object-cover" muted />
        </div>
      )}
      {error && <p className="font-body text-xs text-status-cancelled mt-1">{error}</p>}
    </div>
  );
}
