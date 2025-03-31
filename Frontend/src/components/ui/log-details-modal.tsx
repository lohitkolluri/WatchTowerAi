import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { Log } from "@/types/common";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface LogDetailsModalProps {
  log: Log | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LogDetailsModal({ log, open, onOpenChange }: LogDetailsModalProps) {
  if (!log) return null;

  const getLevelBadge = (level: Log["level"]) => {
    const variants = {
      INFO: "default",
      WARN: "warning",
      ERROR: "destructive",
      DEBUG: "secondary"
    } as const;

    return (
      <Badge variant={variants[level]}>
        {level}
      </Badge>
    );
  };

  const formatData = (data: any) => {
    try {
      return JSON.stringify(data, null, 2);
    } catch (e) {
      return String(data);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getLevelBadge(log.level)}
            <span>{log.service}</span>
          </DialogTitle>
          <DialogDescription>
            {format(new Date(log.timestamp), "PPpp")}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4">
          <div>
            <h3 className="text-sm font-medium mb-2">Message</h3>
            <div className="bg-muted p-3 rounded-md">
              <pre className="whitespace-pre-wrap break-all text-sm">
                {log.message}
              </pre>
            </div>
          </div>

          {(log.metadata || log.raw_payload) && (
            <ScrollArea className="h-[300px]">
              <div className="space-y-4">
                {log.metadata && (
                  <div>
                    <h3 className="text-sm font-medium mb-2">Metadata</h3>
                    <div className="bg-muted p-3 rounded-md">
                      <pre className="whitespace-pre-wrap break-all text-sm">
                        {formatData(log.metadata)}
                      </pre>
                    </div>
                  </div>
                )}

                {log.raw_payload && (
                  <div>
                    <h3 className="text-sm font-medium mb-2">Raw Payload</h3>
                    <div className="bg-muted p-3 rounded-md">
                      <pre className="whitespace-pre-wrap break-all text-sm">
                        {formatData(log.raw_payload)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
