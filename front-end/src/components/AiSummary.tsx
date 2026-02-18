import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles } from "lucide-react";
import { summaryApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export function AiSummary() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [taskCount, setTaskCount] = useState(0);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const generate = async () => {
    setLoading(true);
    setSummary(null);
    try {
      const res = await summaryApi.getDaily(selectedDate);
      setSummary(res.data.summary);
      setTaskCount(res.data.taskCount);
    } catch (err: any) {
      toast({
        title: "Error",
        description:
          err.response?.data?.error || "Failed to generate AI summary",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const renderMarkdown = (md: string) => {
    const lines = md.split("\n");
    const html: string[] = [];
    let inList = false;

    for (const raw of lines) {
      const line = raw.trim();

      if (!line) {
        if (inList) { html.push("</ul>"); inList = false; }
        html.push("<br/>");
        continue;
      }

      // Headings
      if (line.startsWith("## ")) {
        if (inList) { html.push("</ul>"); inList = false; }
        html.push(`<h3 class="text-sm font-semibold mt-3 mb-1">${inline(line.slice(3))}</h3>`);
        continue;
      }

      // Bullet list items
      if (/^[-*•]\s/.test(line)) {
        if (!inList) { html.push('<ul class="list-disc list-inside space-y-0.5 text-muted-foreground">'); inList = true; }
        html.push(`<li>${inline(line.replace(/^[-*•]\s*/, ""))}</li>`);
        continue;
      }

      // Plain paragraph
      if (inList) { html.push("</ul>"); inList = false; }
      html.push(`<p class="text-muted-foreground">${inline(line)}</p>`);
    }
    if (inList) html.push("</ul>");
    return html.join("\n");
  };

  /** Bold + inline code */
  const inline = (text: string) =>
    text
      .replace(/\*\*(.+?)\*\*/g, '<strong class="text-foreground">$1</strong>')
      .replace(/`(.+?)`/g, "<code>$1</code>");

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Summary Date</Label>
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-40"
          />
        </div>
        <Button onClick={generate} disabled={loading} className="gap-2">
          <Sparkles className="h-4 w-4" />
          {loading ? "Generating..." : "Generate AI Summary"}
        </Button>
      </div>

      {loading && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-2/4" />
          </CardContent>
        </Card>
      )}

      {summary !== null && !loading && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              AI Daily Sync Summary
              <span className="ml-auto text-xs font-normal text-muted-foreground">
                {selectedDate} · {taskCount} task{taskCount !== 1 ? "s" : ""}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm prose-sm max-w-none">
            <div dangerouslySetInnerHTML={{ __html: renderMarkdown(summary) }} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
