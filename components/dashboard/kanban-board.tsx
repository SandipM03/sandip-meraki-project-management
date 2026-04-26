import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle } from "lucide-react";

interface KanbanTask {
  id: string;
  title: string;
  status: "TODO" | "DOING" | "DONE";
  assignedTo?: { name?: string };
  projectName: string;
}

interface KanbanBoardProps {
  tasks: KanbanTask[];
  onStatusChange: (taskId: string, status: "TODO" | "DOING" | "DONE") => void;
}

export function KanbanBoard({ tasks, onStatusChange }: KanbanBoardProps) {
  const todoTasks = tasks.filter((t) => t.status === "TODO").slice(0, 7);
  const doingTasks = tasks.filter((t) => t.status === "DOING").slice(0, 7);
  const doneTasks = tasks.filter((t) => t.status === "DONE").slice(0, 7);

  const Column = ({
    title,
    tasks,
    status,
  }: {
    title: string;
    tasks: KanbanTask[];
    status: "TODO" | "DOING" | "DONE";
  }) => (
    <div className="flex-1 min-w-[250px]">
      <div className="mb-3">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              status === "TODO"
                ? "bg-gray-400"
                : status === "DOING"
                  ? "bg-blue-600"
                  : "bg-green-600"
            }`}
          />
          {title}
          <span className="text-muted-foreground text-xs font-normal">
            ({tasks.length})
          </span>
        </h3>
      </div>
      <div className="space-y-2">
        {tasks.map((task) => (
          <div
            key={task.id}
            className="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
          >
            <div className="flex items-start gap-2">
              {status === "DONE" ? (
                <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
              ) : (
                <Circle className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{task.title}</p>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {task.projectName}
                </p>
                {task.assignedTo?.name && (
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                    {task.assignedTo.name}
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-1 mt-2">
              {status !== "DOING" && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-xs"
                  onClick={() => onStatusChange(task.id, "DOING")}
                  aria-label={`Move ${task.title} to doing`}
                >
                  ▶
                </Button>
              )}
              {status !== "DONE" && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-xs"
                  onClick={() => onStatusChange(task.id, "DONE")}
                  aria-label={`Mark ${task.title} as done`}
                >
                  ✓
                </Button>
              )}
            </div>
          </div>
        ))}
        {tasks.length === 0 && (
          <div className="text-center py-4 text-muted-foreground text-xs">
            No tasks
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      <Column title="Todo" tasks={todoTasks} status="TODO" />
      <Column title="Doing" tasks={doingTasks} status="DOING" />
      <Column title="Done" tasks={doneTasks} status="DONE" />
    </div>
  );
}
