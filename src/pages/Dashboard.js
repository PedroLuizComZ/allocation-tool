import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Users, Briefcase, Activity, TrendingUp } from 'lucide-react';

const Dashboard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await api.get('/dashboard/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-sm" data-testid="dashboard-loading">{t('common.loading')}</div>;
  }

  const locationData = stats?.resources_by_location
    ? Object.entries(stats.resources_by_location).map(([name, value]) => ({ name, value }))
    : [];

  const COLORS = ['#002FA7', '#3B82F6', '#10B981', '#F59E0B', '#EF4444'];

  return (
    <div data-testid="dashboard-page">
      <div className="mb-6">
        <h1 className="text-4xl font-bold tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }} data-testid="dashboard-title">
          {t('dashboard.title')}
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="border border-border rounded-sm shadow-sm" data-testid="stat-total-resources">
          <CardHeader className="p-6 pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('dashboard.totalResources')}
              </CardTitle>
              <Users className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
            </div>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <p className="text-2xl font-bold" style={{ fontFamily: 'Manrope, sans-serif' }}>
              {stats?.total_resources || 0}
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border rounded-sm shadow-sm" data-testid="stat-total-projects">
          <CardHeader className="p-6 pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('dashboard.totalProjects')}
              </CardTitle>
              <Briefcase className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
            </div>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <p className="text-2xl font-bold" style={{ fontFamily: 'Manrope, sans-serif' }}>
              {stats?.total_projects || 0}
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border rounded-sm shadow-sm" data-testid="stat-active-projects">
          <CardHeader className="p-6 pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('dashboard.activeProjects')}
              </CardTitle>
              <Activity className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
            </div>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <p className="text-2xl font-bold" style={{ fontFamily: 'Manrope, sans-serif' }}>
              {stats?.active_projects || 0}
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border rounded-sm shadow-sm" data-testid="stat-avg-utilization">
          <CardHeader className="p-6 pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('dashboard.avgUtilization')}
              </CardTitle>
              <TrendingUp className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
            </div>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <p className="text-2xl font-bold" style={{ fontFamily: 'Manrope, sans-serif' }}>
              {stats?.average_utilization || 0}%
            </p>
            {stats?.overallocated_resources > 0 && (
              <button
                onClick={() => navigate('/overallocated')}
                className="text-xs text-destructive mt-1 hover:underline flex items-center gap-1"
                data-testid="overallocation-link"
              >
                ⚠️ {stats.overallocated_resources} overallocated
              </button>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border border-border rounded-sm shadow-sm" data-testid="chart-location">
          <CardHeader className="p-6 pb-2">
            <CardTitle className="text-xl font-semibold" style={{ fontFamily: 'Manrope, sans-serif' }}>
              {t('dashboard.resourcesByLocation')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={locationData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => entry.name}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {locationData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border border-border rounded-sm shadow-sm" data-testid="chart-allocation">
          <CardHeader className="p-6 pb-2">
            <CardTitle className="text-xl font-semibold" style={{ fontFamily: 'Manrope, sans-serif' }}>
              {t('dashboard.allocationByProject')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats?.allocation_by_project || []}>
                <XAxis dataKey="project_name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="resource_count" fill="#002FA7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
