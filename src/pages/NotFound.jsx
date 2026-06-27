import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function NotFound() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 text-center">
      <div className="text-6xl mb-4">📡</div>
      <h1 className="text-2xl font-black text-white mb-2">Page not found</h1>
      <p className="text-white/40 text-sm mb-6 max-w-xs">
        This stream went offline. The page you're looking for doesn't exist.
      </p>
      <Link to={createPageUrl('Home')}
        className="px-6 py-3 rounded-xl bg-amber-500 text-black font-bold text-sm hover:bg-amber-400 transition-colors">
        Back to Home
      </Link>
    </div>
  );
}
