import React from "react";
import { Badge } from "./badge";

interface MultiSelectPillsProps {
  items: Array<{ value: string; label: string }>;
  onRemove: (value: string) => void;
  className?: string;
}

export const MultiSelectPills: React.FC<MultiSelectPillsProps> = ({ items, onRemove, className }) => {
  if (!items.length) return null;
  return (
    <div className={"flex flex-wrap gap-2 mt-2 " + (className || "")}> 
      {items.map((item) => (
        <Badge key={item.value} variant="secondary" className="flex items-center gap-1">
          {item.label}
          <button
            type="button"
            className="ml-1 text-lg leading-none focus:outline-none"
            aria-label={`Remove ${item.label}`}
            onClick={() => onRemove(item.value)}
          >
            ×
          </button>
        </Badge>
      ))}
    </div>
  );
}; 