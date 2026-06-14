"use client";

import { Button } from "./button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  count: number;
  limit: number;
  offset: number;
  onOffsetChange: (offset: number) => void;
}

export function Pagination({ count, limit, offset, onOffsetChange }: PaginationProps) {
  const page = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(count / limit);
  const start = offset + 1;
  const end = Math.min(offset + limit, count);

  if (count === 0) return null;

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-white">
      <p className="text-sm text-slate-500">
        Showing <span className="font-medium">{start}–{end}</span> of{" "}
        <span className="font-medium">{count}</span>
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="icon"
          onClick={() => onOffsetChange(Math.max(0, offset - limit))}
          disabled={offset === 0}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm text-slate-600">
          {page} / {totalPages}
        </span>
        <Button
          variant="secondary"
          size="icon"
          onClick={() => onOffsetChange(offset + limit)}
          disabled={offset + limit >= count}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
