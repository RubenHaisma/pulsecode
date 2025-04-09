"use client"

import { useState } from "react"
import { Calendar, ChevronDown } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"

export type TimeRangeOption = {
  value: string;
  label: string;
}

interface TimeRangeSelectorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  options?: TimeRangeOption[];
}

export const DEFAULT_TIME_RANGES: TimeRangeOption[] = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'Last 7 days' },
  { value: 'month', label: 'Last 30 days' },
  { value: 'year', label: 'Last year' },
  { value: 'all', label: 'All time' },
];

export function TimeRangeSelector({
  value,
  onChange,
  className = '',
  options = DEFAULT_TIME_RANGES
}: TimeRangeSelectorProps) {
  // Get current label from value
  const getCurrentLabel = (): string => {
    const option = options.find(opt => opt.value === value);
    return option?.label || 'Select time range';
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Calendar className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm text-muted-foreground">Time range:</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-[150px] bg-black/60 border-white/20 focus:ring-pink-500">
          <SelectValue placeholder="Select time range">
            <span className="flex items-center">
              <Badge variant="outline" className="bg-transparent text-xs">
                {getCurrentLabel()}
              </Badge>
            </span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-black/90 border-white/20">
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
} 