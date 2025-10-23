import React from 'react';
import { DEFAULT_EXPRESSIONS } from '../constants';

interface ExpressionSelectorProps {
  selectedExpressions: Set<string>;
  setSelectedExpressions: React.Dispatch<React.SetStateAction<Set<string>>>;
  customExpressions: string[];
  onCustomExpressionChange: (index: number, value: string) => void;
}

export const ExpressionSelector: React.FC<ExpressionSelectorProps> = ({
  selectedExpressions,
  setSelectedExpressions,
  customExpressions,
  onCustomExpressionChange,
}) => {
  const handleToggleExpression = (expression: string) => {
    setSelectedExpressions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(expression)) {
        newSet.delete(expression);
      } else {
        newSet.add(expression);
      }
      return newSet;
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-2">选择预设表情</label>
        <div className="flex flex-wrap gap-2">
          {DEFAULT_EXPRESSIONS.map(expr => (
            <button
              key={expr}
              onClick={() => handleToggleExpression(expr)}
              className={`px-3 py-1.5 text-sm font-semibold rounded-full transition-all duration-200 ${
                selectedExpressions.has(expr)
                  ? 'bg-cyan-600 text-white ring-2 ring-cyan-400'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {expr}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-2">
          或自定义表情 (可选)
        </label>
        <div className="grid grid-cols-2 gap-2">
            {customExpressions.map((expr, index) => (
                <input
                    key={index}
                    type="text"
                    value={expr}
                    onChange={e => onCustomExpressionChange(index, e.target.value)}
                    placeholder={`自定义 ${index + 1}`}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:ring-cyan-500 focus:border-cyan-500 transition"
                />
            ))}
        </div>
      </div>
    </div>
  );
};