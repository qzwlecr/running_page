import './index.css';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Activity } from '@/types';
import {
  useFilteredActivities,
  getAvailableYears,
  extractProvince,
  getActivityData,
} from '@/hooks/useActivities';
import { useTheme } from '@/hooks/useTheme';
import { Header, type Page } from '@/components/Header';
import { StatsCards } from '@/components/StatsCards';
import { ContributionHeatmap } from '@/components/ContributionHeatmap';
import { ActivityLog } from '@/components/ActivityLog';
import { RouteMap } from '@/components/RouteMap';
import { CalendarWidget } from '@/components/CalendarWidget';
import { ProfileCard } from '@/components/ProfileCard';
import { PersonalBest } from '@/components/PersonalBest';
import { TracksPage } from '@/components/TracksPage';
import { ChinaMap } from '@/components/ChinaMap';

const getPageFromPath = (): Page =>
  window.location.pathname.replace(/\/$/, '').endsWith('/tracks')
    ? 'tracks'
    : 'summary';

const getPagePath = (page: Page): string => {
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
  return `${basePath}/${page}`;
};

function Dashboard() {
  const activities = getActivityData() as Activity[];
  const { dark, toggle } = useTheme();
  const [filter] = useState('all' as const);
  const [year, setYear] = useState<number | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(
    null
  );
  const [selectedProvince, setSelectedProvince] = useState<string | null>(null);
  const [activityLogScrollRequest, setActivityLogScrollRequest] = useState(0);
  const [page, setPage] = useState<Page>(getPageFromPath);

  const navigate = useCallback((nextPage: Page) => {
    const nextPath = getPagePath(nextPage);
    if (window.location.pathname !== nextPath) {
      window.history.pushState(null, '', nextPath);
    }
    setPage(nextPage);
  }, []);

  useEffect(() => {
    const handlePopState = () => setPage(getPageFromPath());
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const years = getAvailableYears(activities);
  const filtered = useFilteredActivities(activities, filter, year);
  const heatmapYear = year ?? years[0] ?? new Date().getFullYear();

  // Activities filtered to the selected province (for RouteMap)
  const provinceFiltered = useMemo(() => {
    if (!selectedProvince) return filtered;
    return filtered.filter(
      (a) => extractProvince(a.location_country) === selectedProvince
    );
  }, [filtered, selectedProvince]);

  const selectPersonalBest = useCallback(
    (activity: Activity | null) => {
      if (!activity) return;
      setYear(null);
      setSelectedProvince(null);
      setSelectedActivity(activity);
      setActivityLogScrollRequest((request) => request + 1);
    },
    [
      setActivityLogScrollRequest,
      setSelectedActivity,
      setSelectedProvince,
      setYear,
    ]
  );

  return (
    <div className="min-h-screen bg-[var(--color-bg)]" data-filter={filter}>
      <Header
        dark={dark}
        toggleTheme={toggle}
        page={page}
        onNavigate={navigate}
      />

      {page === 'tracks' ? (
        <TracksPage
          activities={filtered}
          filter={filter}
          onSelectActivity={setSelectedActivity}
          onBack={() => navigate('summary')}
        />
      ) : (
        <main className="mx-auto max-w-[1400px] px-6 py-6">
          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_360px] xl:grid-cols-[1fr_380px]">
            {/* Left column */}
            <div className="min-w-0 space-y-6 overflow-hidden">
              <StatsCards
                activities={filtered}
                allActivities={activities}
                year={year}
                filter={filter}
                onSelectActivity={setSelectedActivity}
              />
              <ContributionHeatmap
                activities={filtered}
                year={heatmapYear}
                filter={filter}
                onSelectActivity={setSelectedActivity}
              />
              <ActivityLog
                activities={filtered}
                years={years}
                year={year}
                setYear={setYear}
                selectedActivity={selectedActivity}
                onSelectActivity={setSelectedActivity}
                filter={filter}
                scrollRequest={activityLogScrollRequest}
              />
            </div>

            {/* Right column */}
            <div className="flex min-w-0 flex-col gap-6 overflow-hidden">
              <ProfileCard activities={activities} filter={filter} />
              <ChinaMap
                activities={filtered}
                filter={filter}
                selectedProvince={selectedProvince}
                onSelectProvince={(p) => {
                  setSelectedProvince(p);
                  setSelectedActivity(null);
                }}
              />
              <RouteMap
                activities={provinceFiltered}
                selectedActivity={selectedActivity}
                dark={dark}
                onClearSelection={() => setSelectedActivity(null)}
              />
              <PersonalBest
                activities={activities}
                onSelectActivity={selectPersonalBest}
              />
              <CalendarWidget
                activities={filtered}
                onSelectActivity={setSelectedActivity}
              />
            </div>
          </div>
        </main>
      )}

      <footer className="border-t border-[var(--color-border)] py-6 text-center text-sm text-[var(--color-muted)]">
        &copy; {new Date().getFullYear()} Running Page 3.0
      </footer>
    </div>
  );
}

export default Dashboard;
