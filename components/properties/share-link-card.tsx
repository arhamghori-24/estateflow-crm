"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Copy, Check } from "lucide-react";

export function ShareLinkCard({ shareToken }: { shareToken: string }) {
  const [copied, setCopied] = useState(false);
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const url = `${baseUrl}/share/property/${shareToken}`;
  async function copy() {
    await navigator.clipboard.writeText(url);
    setCopied(true); setTimeout(() => setCopied(false), 1500);
  }
  return (
    <Card>
      <CardHeader><CardTitle>Public Share Link</CardTitle></CardHeader>
      <CardContent className="flex gap-2">
        <Input readOnly value={url} className="flex-1 text-xs" />
        <Button variant="outline" size="icon" onClick={copy}>{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}</Button>
      </CardContent>
    </Card>
  );
}
