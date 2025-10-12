import React, { useMemo, useState } from 'react';
import Header from '../components/header/Header';
import { useAuth } from '../context/AuthContext';
import TemplateCard from '../components/allTemplate/TemplateCard';
import TemplateModal from '../components/allTemplate/TemplateModal';
import { templates as allTemplates } from '../utils/mockData';
import { getUserDisplayInfo } from '../utils/user';

const AllTemplate: React.FC = () => {
  const { user, userProfile } = useAuth();
  const { name: displayName, initials } = getUserDisplayInfo(userProfile, user);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<number | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allTemplates;
    return allTemplates.filter(t => (t.name + ' ' + t.description).toLowerCase().includes(q));
  }, [query]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header userName={displayName} initials={initials} />

      <main className="max-w-6xl mx-auto px-6 pb-16">
        <div className="flex items-end justify-between gap-4 py-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Templates</h1>
            <p className="text-gray-600 text-sm mt-1">Choose a template to kickstart your project documentation</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:items-center mb-6">
          <div className="flex-1">
            <label htmlFor="searchInput" className="sr-only">Search templates</label>
            <input id="searchInput" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search templates..." className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(t => (
            <TemplateCard key={t.id} template={t} onUse={(id) => setSelected(id)} />
          ))}
        </div>
      </main>

      {selected && <TemplateModal id={selected} onClose={() => setSelected(null)} />}
    </div>
  );
};

export default AllTemplate;
