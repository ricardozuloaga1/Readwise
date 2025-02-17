import { useState } from 'react';
import { NewspaperIcon, BriefcaseIcon, ComputerDesktopIcon, BeakerIcon, HeartIcon, ChevronDownIcon } from '@heroicons/react/24/outline';

const CATEGORIES = {
  general: {
    name: 'General',
    icon: NewspaperIcon,
    color: 'blue'
  },
  business: {
    name: 'Business',
    icon: BriefcaseIcon,
    color: 'emerald'
  },
  technology: {
    name: 'Technology',
    icon: ComputerDesktopIcon,
    color: 'purple'
  },
  science: {
    name: 'Science',
    icon: BeakerIcon,
    color: 'amber'
  },
  health: {
    name: 'Health',
    icon: HeartIcon,
    color: 'rose'
  }
} as const;

type Category = keyof typeof CATEGORIES;

interface CategorySelectorProps {
  selectedCategory: Category;
  onSelectCategory: (category: Category) => void;
}

export default function CategorySelector({ selectedCategory, onSelectCategory }: CategorySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedCategoryData = CATEGORIES[selectedCategory];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-2 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700"
      >
        <div className="flex items-center space-x-2">
          <selectedCategoryData.icon className={`h-5 w-5 text-${selectedCategoryData.color}-500`} />
          <span className="font-medium text-gray-900 dark:text-white">
            {selectedCategoryData.name} News
          </span>
        </div>
        <ChevronDownIcon 
          className={`h-5 w-5 text-gray-500 transition-transform duration-200 ${
            isOpen ? 'transform rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          {Object.entries(CATEGORIES).map(([key, category]) => {
            const Icon = category.icon;
            const isSelected = key === selectedCategory;
            
            return (
              <button
                key={key}
                onClick={() => {
                  onSelectCategory(key as Category);
                  setIsOpen(false);
                }}
                className={`
                  w-full flex items-center space-x-2 px-4 py-2
                  transition-colors duration-200
                  ${isSelected 
                    ? `text-${category.color}-600 bg-${category.color}-50 dark:bg-${category.color}-900/10 dark:text-${category.color}-400`
                    : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700'
                  }
                `}
              >
                <Icon className={`h-5 w-5 ${
                  isSelected ? `text-${category.color}-500` : 'text-gray-400'
                }`} />
                <span className="font-medium">{category.name}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export type { Category };
export { CATEGORIES }; 