import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "@/lib/utils";
import { AlertCircle, CheckCircle2, Circle } from "lucide-react";

interface TaskCardProps {
  id: string;
  title: string;
  status: "TODO" | "DOING" | "DONE";
  dueDate?: Date;
  projectName: string;
  assigneeName?: string;
  isOverdue?: boolean;
  onStatusChange: (status: "TODO" | "DOING" | "DONE") => void;
}

export function TaskCard({
  id,
  title,
  status,
  dueDate,
  projectName,
  assigneeName,
  isOverdue,
  onStatusChange,
}: TaskCardProps) {
  const getStatusIcon = () => {
    switch (status) {
      case "DONE":
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case "DOING":
        return <Circle className="w-4 h-4 text-blue-600 fill-blue-600" />;
      default:
        return <Circle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getNextStatus = (): "TODO" | "DOING" | "DONE" => {
    switch (status) {
      case "TODO":
        return "DOING";
      case "DOING":
        return "DONE";
      default:
        return "TODO";
    }
  };

  return (
    <div
      className={`flex items-start justify-between gap-3 p-3 rounded-lg border transition-all ${
        isOverdue
          ? "border-red-200 bg-red-50 hover:shadow-md dark:border-red-900 dark:bg-red-950 dark:hover:shadow-lg"
          : "border-gray-200 bg-white hover:border-gray-400 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-500 dark:hover:shadow-lg"
      }`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2">
          {getStatusIcon()}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{title}</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-xs text-muted-foreground">{projectName}</span>
              {assigneeName && (
                <span className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-2 py-0.5 rounded">
                  {assigneeName}
                </span>
              )}
            </div>
          </div>
        </div>
        {dueDate && (
          <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
            {isOverdue && <AlertCircle className="w-3 h-3 text-red-600" />}
            Due {formatDistanceToNow(dueDate)}
          </div>
        )}
      </div>
      <div className="flex gap-1">
        <Button
          size="sm"
          variant="ghost"
          className="h-8 px-2"
          onClick={() => onStatusChange("DOING")}
          aria-label={`Mark ${title} as doing`}
        >
          ▶
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 px-2"
          onClick={() => onStatusChange("DONE")}
          aria-label={`Mark ${title} as done`}
        >
          ✓
        </Button>
      </div>
    </div>
  );
}
