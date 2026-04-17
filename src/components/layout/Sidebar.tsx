import { NavLink, useNavigate } from 'react-router-dom';
import { useActivities } from '../../hooks/useActivities';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const navigate = useNavigate();
  const { activities, isLoading } = useActivities();

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 flex flex-col h-full transform transition-transform duration-200 md:static md:translate-x-0 ${
        open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}
    >
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900">Activity Tracker</h1>
        <button
          type="button"
          onClick={onClose}
          className="md:hidden p-1 -mr-1 text-gray-500 hover:text-gray-900 rounded"
          aria-label="Close navigation"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <nav className="flex-1 overflow-auto p-2">
        {isLoading ? (
          <p className="text-sm text-gray-500 p-2">Loading...</p>
        ) : activities.length === 0 ? (
          <p className="text-sm text-gray-500 p-2">No activities yet</p>
        ) : (
          <ul className="space-y-1">
            {activities.map((activity) => (
              <li key={activity.id}>
                <NavLink
                  to={`/activities/${activity.id}`}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `block px-3 py-2 rounded-md text-sm transition-colors ${
                      isActive
                        ? 'bg-indigo-50 text-indigo-700 font-medium'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`
                  }
                >
                  <div>{activity.name}</div>
                  {activity.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {activity.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        )}
      </nav>

      <div className="p-2 border-t border-gray-200">
        <button
          onClick={() => { onClose(); navigate('/activities/new'); }}
          className="w-full px-3 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-md hover:bg-indigo-100 transition-colors"
        >
          + New Activity
        </button>
      </div>
    </aside>
  );
}
