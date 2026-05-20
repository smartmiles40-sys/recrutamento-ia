import { useState, useRef } from "react";
import { Upload, X, FileVideo, FileText, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  accept: string;
  label: string;
  hint?: string;
  icon?: "video" | "file";
  /** Maximum allowed size in MB. Default: 10. */
  maxSizeMB?: number;
  onChange?: (file: File | null) => void;
}

// Parses an HTML `accept` string into a predicate that matches a File's
// mime / extension. Accepts patterns: ".pdf", "application/pdf", "image/*".
function matchAccept(accept: string): (file: File) => boolean {
  const patterns = accept
    .split(",")
    .map((p) => p.trim().toLowerCase())
    .filter(Boolean);

  if (!patterns.length || patterns.includes("*/*")) return () => true;

  return (file: File) => {
    const name = file.name.toLowerCase();
    const type = (file.type || "").toLowerCase();
    return patterns.some((p) => {
      if (p.startsWith(".")) return name.endsWith(p);
      if (p.endsWith("/*")) {
        const prefix = p.slice(0, -1); // "image/"
        return type.startsWith(prefix);
      }
      return type === p;
    });
  };
}

export default function FileUpload({ accept, label, hint, icon = "file", maxSizeMB = 10, onChange }: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const accepts = matchAccept(accept);
  const maxBytes = maxSizeMB * 1024 * 1024;

  const handleFile = (f: File | null) => {
    setError(null);
    if (!f) {
      setFile(null);
      onChange?.(null);
      return;
    }
    if (!accepts(f)) {
      setError(`Tipo de arquivo não aceito. Use: ${accept}`);
      onChange?.(null);
      setFile(null);
      return;
    }
    if (f.size > maxBytes) {
      const sizeMB = (f.size / 1024 / 1024).toFixed(1);
      setError(`Arquivo (${sizeMB} MB) excede o limite de ${maxSizeMB} MB.`);
      onChange?.(null);
      setFile(null);
      return;
    }
    setFile(f);
    onChange?.(f);
  };

  const Icon = icon === "video" ? FileVideo : FileText;

  return (
    <div className="space-y-2">
      <div
        className={cn(
          "relative rounded-xl border-2 border-dashed p-6 text-center transition-colors",
          dragOver ? "border-accent bg-accent/5" : "border-border",
          file && "border-solid border-accent/40 bg-accent/5",
          error && "border-destructive/40 bg-destructive/5",
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
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
              type="button"
              aria-label="Remover arquivo"
              onClick={() => handleFile(null)}
              className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            aria-label={label}
            onClick={() => inputRef.current?.click()}
            className="flex w-full flex-col items-center gap-2"
          >
            <Upload className="h-8 w-8 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">{label}</span>
            {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
            <span className="text-[11px] text-muted-foreground/70">Tamanho máximo: {maxSizeMB} MB</span>
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
      {error && (
        <div role="alert" className="flex items-center gap-2 rounded-lg bg-destructive/5 px-3 py-2 text-xs text-destructive">
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}
