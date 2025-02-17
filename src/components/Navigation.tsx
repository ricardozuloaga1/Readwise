import Link from 'next/link';
import { BookmarkIcon } from '@heroicons/react/24/outline';

const Navigation = () => {
  return (
    <nav className="flex space-x-4">
      <Link href="/bookmarks" className="flex items-center space-x-2">
        <BookmarkIcon className="h-6 w-6" />
        <span>Bookmarks</span>
      </Link>
    </nav>
  );
};

export default Navigation; 