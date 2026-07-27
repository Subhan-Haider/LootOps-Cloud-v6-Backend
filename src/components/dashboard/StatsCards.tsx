import { File, Folder, HardDrive, Server } from "lucide-react";
import { SystemStats } from "@/lib/api";

interface StatsCardsProps {
  statsData: SystemStats | null;
  isLoading?: boolean;
}

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-gray-900">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-slate-200 dark:bg-slate-700" />
        <div className="flex-1">
          <div className="h-3 w-20 rounded-full bg-slate-200 dark:bg-slate-700 mb-2" />
          <div className="h-6 w-14 rounded-full bg-slate-200 dark:bg-slate-700" />
        </div>
      </div>
    </div>
  );
}

export function StatsCards({ statsData, isLoading }: StatsCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  const cards = [
    {
      name: "Total Files",
      value: statsData?.totalFiles.toLocaleString() ?? "0",
      icon: File,
      gradient: "from-blue-500 to-indigo-600",
      bg: "bg-blue-50 dark:bg-blue-950/30",
      text: "text-blue-600 dark:text-blue-400",
      change: `${statsData?.filesByType?.image ?? 0} images`,
    },
    {
      name: "Total Folders",
      value: statsData?.totalFolders.toLocaleString() ?? "0",
      icon: Folder,
      gradient: "from-purple-500 to-pink-600",
      bg: "bg-purple-50 dark:bg-purple-950/30",
      text: "text-purple-600 dark:text-purple-400",
      change: `${statsData?.mostUploadedFolder ?? "—"} is busiest`,
    },
    {
      name: "App Storage",
      value: statsData ? `${parseFloat(statsData.totalSizeMB) > 1024
        ? (parseFloat(statsData.totalSizeMB) / 1024).toFixed(1) + " GB"
        : statsData.totalSizeMB + " MB"}` : "0 MB",
      icon: HardDrive,
      gradient: "from-emerald-500 to-teal-600",
      bg: "bg-emerald-50 dark:bg-emerald-950/30",
      text: "text-emerald-600 dark:text-emerald-400",
      change: `${statsData?.filesByType?.video ?? 0} videos`,
    },
    {
      name: "Server Drive",
      value: statsData?.disk ? `${(statsData.disk.used / 1024 / 1024 / 1024).toFixed(1)} GB` : "Unknown",
      icon: Server,
      gradient: "from-amber-500 to-orange-600",
      bg: "bg-amber-50 dark:bg-amber-950/30",
      text: "text-amber-600 dark:text-amber-400",
      change: statsData?.disk ? `of ${(statsData.disk.total / 1024 / 1024 / 1024).toFixed(1)} GB total` : "Storage capacity",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.name}
          className="card-hover rounded-2xl border border-slate-200/60 bg-white p-5 dark:border-slate-800/60 dark:bg-gray-900"
        >
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 truncate">
                {card.name}
              </p>
              <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white truncate">
                {card.value}
              </p>
              <p className={`mt-1 text-xs font-medium truncate ${card.text}`} title={card.change}>
                {card.change}
              </p>
            </div>
            <div className={`shrink-0 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${card.gradient} shadow-sm`}>
              <card.icon className="h-5 w-5 text-white" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
