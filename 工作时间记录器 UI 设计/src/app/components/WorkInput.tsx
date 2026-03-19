import { Edit } from 'lucide-react';

interface WorkInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function WorkInput({ value, onChange, disabled }: WorkInputProps) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">📝</span>
        <h3 className="text-gray-700 font-medium">工作内容</h3>
      </div>
    </div>
  );
}
