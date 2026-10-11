import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const DEFAULT_CATEGORIES = [
  "Development",
  "Email",
  "Social",
  "Entertainment",
  "Finance",
  "Shopping",
  "Other",
];

interface CategorySelectProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  options?: string[];
  className?: string;
}

export function CategorySelect({
  value,
  onChange,
  id,
  options = DEFAULT_CATEGORIES,
  className,
}: CategorySelectProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger id={id} className={cn("h-9 text-sm", className)}>
        <SelectValue placeholder="Select a category" />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option} value={option}>
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
