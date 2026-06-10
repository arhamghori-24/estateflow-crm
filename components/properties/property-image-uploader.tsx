"use client";
import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { addPropertyImageRecord } from "@/lib/db/actions";
import { Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function PropertyImageUploader({
  propertyId, organizationId, existingImages,
}: {
  propertyId: string;
  organizationId: string;
  existingImages: { id: string; url: string }[];
}) {
  const [uploading, setUploading] = useState(false);
  const supabase = createClient();

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const path = `${organizationId}/${propertyId}/${Date.now()}-${file.name.replace(/\s+/g, "_")}`;
        const { error } = await supabase.storage.from("property-images").upload(path, file, { upsert: false });
        if (error) { toast.error(error.message); continue; }
        const { data } = supabase.storage.from("property-images").getPublicUrl(path);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const r = await addPropertyImageRecord(propertyId, data.publicUrl, path) as any;
        if (r.error) toast.error(r.error);
      }
      toast.success("Uploaded");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-2">
        {existingImages.map((img) => (
          <div key={img.id} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
            <Image src={img.url} alt="" fill className="object-cover" sizes="200px" />
          </div>
        ))}
        <label className="relative aspect-square rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer hover:bg-accent">
          {uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Upload className="h-6 w-6 text-muted-foreground" />}
          <span className="mt-1 text-xs text-muted-foreground">Add photos</span>
          <input type="file" accept="image/*" multiple onChange={onPick} className="hidden" disabled={uploading} />
        </label>
      </div>
    </div>
  );
}
