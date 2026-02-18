import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useRef, useCallback, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { taskApi, noteApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Loader2, Wand2, WandSparkles } from "lucide-react";

const schema = z.object({
  note: z.string().min(1, "Note is required"),
});

type FormData = z.infer<typeof schema>;

interface DailyUpdateDialogProps {
  open: boolean;
  taskId: string | null;
  taskTitle?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function DailyUpdateDialog({ open, taskId, taskTitle, onClose, onSuccess }: DailyUpdateDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState("");
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const [refineLoading, setRefineLoading] = useState(false);
  const [autoCompleteEnabled, setAutoCompleteEnabled] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const mirrorRef = useRef<HTMLDivElement | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      note: "",
    },
  });

  const noteValue = watch("note");

  // Sync textarea scroll with mirror overlay
  const syncScroll = useCallback(() => {
    if (textareaRef.current && mirrorRef.current) {
      mirrorRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }, []);

  // Debounced autocomplete
  const fetchSuggestion = useCallback(
    (text: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (text.trim().length < 5) {
        setSuggestion("");
        return;
      }
      debounceRef.current = setTimeout(async () => {
        setSuggestionLoading(true);
        try {
          const res = await noteApi.autocomplete(text, taskTitle);
          const s = res.data.suggestion;
          if (s && s.trim()) {
            setSuggestion(s.trim());
          } else {
            setSuggestion("");
          }
        } catch {
          setSuggestion("");
        } finally {
          setSuggestionLoading(false);
        }
      }, 1000);
    },
    [taskTitle]
  );

  // Watch note changes for autocomplete
  useEffect(() => {
    if (!autoCompleteEnabled) {
      setSuggestion("");
      if (debounceRef.current) clearTimeout(debounceRef.current);
      return;
    }
    if (noteValue) {
      fetchSuggestion(noteValue);
    } else {
      setSuggestion("");
    }
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [noteValue, fetchSuggestion, autoCompleteEnabled]);

  // Clear suggestion when user edits (if suggestion was showing, new text invalidates it)
  const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    registerRest.onChange(e);
    // If user is typing, any existing suggestion becomes stale — fetchSuggestion will replace
  };

  // Accept suggestion with Tab key
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab" && suggestion) {
      e.preventDefault();
      // Add a space before suggestion if the note doesn't end with one
      const spacer = noteValue && !noteValue.endsWith(" ") ? " " : "";
      const newNote = noteValue + spacer + suggestion;
      setValue("note", newNote);
      setSuggestion("");
      // Move cursor to end
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = newNote.length;
          textareaRef.current.selectionEnd = newNote.length;
          textareaRef.current.focus();
        }
      }, 0);
    }
  };

  // Refine note with AI
  const handleRefine = async () => {
    const currentNote = noteValue?.trim();
    if (!currentNote || currentNote.length < 3) {
      toast({ title: "Note too short", description: "Type at least a few words to refine", variant: "destructive" });
      return;
    }
    setRefineLoading(true);
    try {
      const res = await noteApi.refine(currentNote, taskTitle);
      const refined = res.data.refined;
      if (refined && refined.trim()) {
        setValue("note", refined.trim());
        setSuggestion("");
        toast({ title: "Refined", description: "Your note has been improved by AI" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to refine note", variant: "destructive" });
    } finally {
      setRefineLoading(false);
    }
  };

  const onSubmit = async (data: FormData) => {
    if (!taskId) return;
    setLoading(true);
    try {
      await taskApi.update(taskId, {
        updates: {
          note: data.note,
        }
      } as any);
      toast({ title: "Success", description: "Update added successfully" });
      reset();
      setSuggestion("");
      onClose();
      onSuccess();
    } catch (error) {
      toast({ title: "Error", description: "Failed to add update", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const { ref: registerRef, ...registerRest } = register("note");

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); setSuggestion(""); onClose(); } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Daily Update</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label>Note</Label>
              <div className="flex items-center gap-0.5">
                <TooltipProvider delayDuration={500}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => {
                          setAutoCompleteEnabled((prev) => {
                            if (prev) {
                              setSuggestion("");
                              if (debounceRef.current) clearTimeout(debounceRef.current);
                            }
                            return !prev;
                          });
                        }}
                      >
                        {autoCompleteEnabled ? (
                          <WandSparkles className="h-4 w-4 text-violet-500" />
                        ) : (
                          <Wand2 className="h-4 w-4 text-muted-foreground/50" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p>{autoCompleteEnabled ? "AI autocomplete ON — click to turn off" : "AI autocomplete OFF — click to turn on"}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider delayDuration={500}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={handleRefine}
                        disabled={refineLoading || loading || !noteValue?.trim()}
                      >
                        {refineLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Sparkles className="h-4 w-4 text-violet-500" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left">
                      <p>Refine with AI — fix grammar &amp; add detail</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>

            {/* Textarea with inline ghost text overlay */}
            <div className="relative">
              <textarea
                {...registerRest}
                ref={(e) => {
                  registerRef(e);
                  textareaRef.current = e;
                }}
                placeholder="What did you work on today?"
                rows={4}
                onKeyDown={handleKeyDown}
                onChange={handleNoteChange}
                onScroll={syncScroll}
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y relative z-10 caret-current"
                style={{ background: "transparent" }}
              />
              {/* Ghost text mirror overlay */}
              <div
                ref={mirrorRef}
                aria-hidden="true"
                className="absolute inset-0 px-3 py-2 text-sm pointer-events-none overflow-hidden whitespace-pre-wrap break-words"
                style={{ wordBreak: "break-word" }}
              >
                {/* Invisible real text to position the ghost suggestion correctly */}
                <span className="invisible">{noteValue}</span>
                {suggestion && (
                  <span className="text-muted-foreground/40">{noteValue && !noteValue.endsWith(" ") ? " " : ""}{suggestion}</span>
                )}
              </div>
            </div>

            {errors.note && <p className="text-xs text-destructive mt-1">{errors.note.message}</p>}

            {/* Inline hint */}
            {suggestionLoading && (
              <div className="flex items-center gap-1.5 mt-1.5">
                <Loader2 className="h-3 w-3 animate-spin text-muted-foreground/60" />
                <span className="text-[11px] text-muted-foreground/60">AI is thinking...</span>
              </div>
            )}
            {suggestion && !suggestionLoading && (
              <p className="text-[11px] text-muted-foreground/60 mt-1.5">
                Press <kbd className="px-1 py-0.5 rounded bg-muted text-[10px] font-mono border">Tab</kbd> to accept
              </p>
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button type="button" variant="outline" onClick={() => { reset(); setSuggestion(""); onClose(); }} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>{loading ? "Saving..." : "Submit Update"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
