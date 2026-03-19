import { Edit } from 'lucide-react';

interface TagSelectorProps {
  selectedTag: string;
  onSelectTag: (tag: string) => void;
  disabled?: boolean;
}

export function TagSelector({ selectedTag, onSelectTag, disabled }: TagSelectorProps) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">🏷️</span>
        <h3 className="text-gray-700 font-medium">管理标签</h3>
      </div>
    </div>
  );
}
