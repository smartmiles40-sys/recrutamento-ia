import { useState, useRef } from "react";
import { Upload, X, FileVideo, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  accept: string;
  label: string;
  hint?: string;
  icon?: "video" | "file";
  onChange?: (file: File | null) => void;
}

export default function FileUpload({ accept, label, hint, icon = "file", onChange }: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File | null) => {
    setFile(f);
    onChange?.(f);
  };

  const Icon = icon === "video" ? FileVideo : FileText;

  return (
    <div
      className={cn(
        "relative rounded-xl border-2 border-dashed p-6 text-center transition-colors",
        dragOver ? "border-accent bg-accent/5" : "border-border",
        file && "border-solid border-accent/40 bg-accent/5"
      )}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const f = e.dataTransfer.files[0];
        if (f) handleFile(f);
      }}
    >
      {file ? (
        <div className="flex items-center justify-center gap-3">
          <Icon className="h-5 w-5 text-foreground" />
          <span className="text-sm font-medium text-foreground">{file.name}</span>
          <button
            onClick={() => handleFile(null)}
            className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex w-full flex-col items-center gap-2"
        >
          <Upload className="h-8 w-8 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">{label}</span>
          {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0] || null)}
      />
    </div>
  );
}
