import { FileCard } from "./FileCard";
import { FileData } from "@/lib/api";

interface FileGridProps {
  files: FileData[];
  selectedFiles: string[];
  viewMode: "grid" | "list";
  onSelectFile: (key: string) => void;
  onDelete: (folder: string, name: string) => void;
  onRename: (file: FileData) => void;
  onMove: (file: FileData) => void;
  onShare: (file: FileData) => void;
  onTogglePrivacy: (file: FileData) => void;
  onPreview: (file: FileData) => void;
  onMoveToVault?: (file: FileData) => void;
  onRefresh?: () => void;
  isLoading?: boolean;
  readOnly?: boolean;
}

export function FileGrid({
  files, selectedFiles, viewMode, onSelectFile,
  onDelete, onRename, onMove, onShare, onTogglePrivacy, onPreview, onMoveToVault, onRefresh, isLoading, readOnly,
}: FileGridProps) {

  if (isLoading) {
    return viewMode === "grid" ? (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {[...Array(12)].map((_, i) => (
          <div key={i} className="animate-pulse rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="h-44 bg-slate-200 dark:bg-slate-800" />
            <div className="p-3 space-y-2">
              <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full w-3/4" />
              <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full w-1/2" />
            </div>
          </div>
        ))}
      </div>
    ) : (
      <div className="space-y-1">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3 animate-pulse">
            <div className="h-4 w-4 rounded bg-slate-200 dark:bg-slate-700" />
            <div className="h-9 w-9 rounded-lg bg-slate-200 dark:bg-slate-700" />
            <div className="flex-1">
              <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full w-1/3 mb-1.5" />
              <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full w-1/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 py-16 text-center dark:border-slate-800">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
          <svg className="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
        </div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">No files found</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Upload files or change your search / filter.
        </p>
      </div>
    );
  }

  if (viewMode === "list") {
    return (
      <div className="overflow-hidden rounded-2xl border border-slate-200/60 bg-white dark:border-slate-800/60 dark:bg-gray-900">
        {files.map((file) => {
          const key = `${file.folder}/${file.name}`;
          return (
            <FileCard
              key={key}
              file={file}
              viewMode="list"
              isSelected={selectedFiles.includes(key)}
              onSelect={() => onSelectFile(key)}
              onDelete={onDelete}
              onRename={onRename}
              onMove={onMove}
              onShare={onShare}
              onTogglePrivacy={onTogglePrivacy}
              onPreview={onPreview}
              onMoveToVault={onMoveToVault}
              onRefresh={onRefresh}
            />
          );
        })}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {files.map((file) => {
        const key = `${file.folder}/${file.name}`;
        return (
          <FileCard
            key={key}
            file={file}
            viewMode="grid"
            isSelected={selectedFiles.includes(key)}
            onSelect={() => onSelectFile(key)}
            onDelete={onDelete}
            onRename={onRename}
            onMove={onMove}
            onShare={onShare}
            onTogglePrivacy={onTogglePrivacy}
            onPreview={onPreview}
            onMoveToVault={onMoveToVault}
            onRefresh={onRefresh}
            readOnly={readOnly}
          />
        );
      })}
    </div>
  );
}
