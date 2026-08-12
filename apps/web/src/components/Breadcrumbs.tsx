import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { useTheme } from '../context/ThemeContext';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  const { themeClasses } = useTheme();

  return (
    <nav className="flex items-center gap-1 text-sm">
      <Link
        to={createPageUrl('Dashboard')}
        className={`flex items-center gap-1.5 px-2 py-1 rounded-md ${themeClasses.textSecondary} ${themeClasses.hoverBg} transition-colors`}
      >
        <Home className="w-3.5 h-3.5" />
        <span className="sr-only md:not-sr-only">Home</span>
      </Link>

      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-1">
          <ChevronRight className={`w-3.5 h-3.5 ${themeClasses.textTertiary}`} />
          {item.href ? (
            <Link
              to={item.href}
              className={`px-2 py-1 rounded-md ${themeClasses.textSecondary} ${themeClasses.hoverBg} transition-colors`}
            >
              {item.label}
            </Link>
          ) : (
            <span className={`px-2 py-1 ${themeClasses.text}`}>
              {item.label}
            </span>
          )}
        </div>
      ))}
    </nav>
  );
}