import { formatDistanceToNow } from "@/lib/utils";
import { User } from "lucide-react";

interface Activity {
  id: string;
  type: string;
  user?: { name?: string; email: string };
  task?: { title: string; project?: { name: string } };
  createdAt: Date;
}

interface ActivityFeedProps {
  activities: Activity[];
}

export function ActivityFeed({ activities }: ActivityFeedProps) {
  const getActivityDescription = (activity: Activity) => {
    switch (activity.type) {
      case "TASK_CREATED":
        return "created task";
      case "TASK_UPDATED":
        return "updated task";
      case "TASK_COMPLETED":
        return "completed task";
      case "COMMENT_ADDED":
        return "commented on task";
      default:
        return "updated";
    }
  };

  if (activities.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p className="text-sm">No recent activity</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {activities.map((activity) => (
        <div
          key={activity.id}
          className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <div className="flex-shrink-0 mt-1">
            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
              <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm">
              <span className="font-medium">
                {activity.user?.name || activity.user?.email.split("@")[0]}
              </span>
              {""} {getActivityDescription(activity)}
            </p>
            {activity.task && (
              <p className="text-xs text-muted-foreground truncate">
                {activity.task.title}{" "}
                {activity.task.project && `in ${activity.task.project.name}`}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-0.5">
              {formatDistanceToNow(activity.createdAt)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
