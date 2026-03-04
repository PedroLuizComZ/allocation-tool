import React, { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { AlertTriangle, ArrowUpDown, Filter } from 'lucide-react';

const Analytics = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [skills, setSkills] = useState([]);
  const [utilization, setUtilization] = useState([]);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Sorting and filtering states
  const [skillsSort, setSkillsSort] = useState('count-desc'); // count-desc, count-asc, a-z, z-a
  const [utilizationSort, setUtilizationSort] = useState('util-desc'); // util-desc, util-asc, name-asc, name-desc
  const [countryFilter, setCountryFilter] = useState('all');
  const [zoneFilter, setZoneFilter] = useState('all');

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const [skillsRes, utilizationRes, resourcesRes] = await Promise.all([
        api.get('/analytics/skills'),
        api.get('/analytics/utilization'),
        api.get('/resources')
      ]);
      setSkills(skillsRes.data.skills || []);
      setUtilization(utilizationRes.data.utilization || []);
      setResources(resourcesRes.data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get unique values for filters
  const uniqueCountries = useMemo(() => {
    const countries = [...new Set(resources.map(r => r.country).filter(Boolean))];
    return countries.sort();
  }, [resources]);

  const uniqueZones = useMemo(() => {
    const zones = [...new Set(resources.map(r => r.zone).filter(Boolean))];
    return zones.sort();
  }, [resources]);

  // Sort and process skills data
  const sortedSkills = useMemo(() => {
    let sorted = [...skills];
    switch (skillsSort) {
      case 'count-desc':
        sorted.sort((a, b) => b.count - a.count);
        break;
      case 'count-asc':
        sorted.sort((a, b) => a.count - b.count);
        break;
      case 'a-z':
        sorted.sort((a, b) => a.skill.localeCompare(b.skill));
        break;
      case 'z-a':
        sorted.sort((a, b) => b.skill.localeCompare(a.skill));
        break;
      default:
        break;
    }
    return sorted;
  }, [skills, skillsSort]);

  // Filter and sort utilization data
  const filteredUtilization = useMemo(() => {
    let filtered = utilization.map(u => {
      const resource = resources.find(r => r.name === u.resource_name);
      return { ...u, country: resource?.country || '', zone: resource?.zone || '', resourceId: resource?.id };
    });

    // Apply filters
    if (countryFilter !== 'all') {
      filtered = filtered.filter(u => u.country === countryFilter);
    }
    if (zoneFilter !== 'all') {
      filtered = filtered.filter(u => u.zone === zoneFilter);
    }

    // Apply sorting
    switch (utilizationSort) {
      case 'util-desc':
        filtered.sort((a, b) => b.utilization - a.utilization);
        break;
      case 'util-asc':
        filtered.sort((a, b) => a.utilization - b.utilization);
        break;
      case 'name-asc':
        filtered.sort((a, b) => a.resource_name.localeCompare(b.resource_name));
        break;
      case 'name-desc':
        filtered.sort((a, b) => b.resource_name.localeCompare(a.resource_name));
        break;
      default:
        break;
    }

    return filtered;
  }, [utilization, resources, countryFilter, zoneFilter, utilizationSort]);

  const getUtilizationColor = (value) => {
    if (value < 50) return '#10B981';
    if (value < 80) return '#F59E0B';
    return '#EF4444';
  };

  // Handle skill bar click - navigate directly to resources page with skill filter
  const handleSkillClick = (data) => {
    if (data && data.activePayload && data.activePayload[0]) {
      const skill = data.activePayload[0].payload.skill;
      // Navigate to resources page - could add skill filter parameter
      navigate(`/resources?skill=${encodeURIComponent(skill)}`);
    }
  };

  // Handle utilization bar click - navigate directly to allocations filtered by resource
  const handleUtilizationClick = (data) => {
    if (data && data.activePayload && data.activePayload[0]) {
      const resourceId = data.activePayload[0].payload.resourceId;
      if (resourceId) {
        navigate(`/allocations?resource=${resourceId}&fromToday=true`);
      }
    }
  };

  if (loading) return <div className="text-sm">{t('common.loading')}</div>;

  const overallocatedCount = filteredUtilization.filter(u => u.is_overallocated).length;

  return (
    <div data-testid="analytics-page">
      <div className="mb-6">
        <h1 className="text-4xl font-bold tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
          {t('analytics.title')}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Click on chart bars to navigate to detailed views
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Skills Distribution Chart */}
        <Card className="border border-border rounded-sm shadow-sm" data-testid="chart-skills">
          <CardHeader className="p-6 pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-semibold" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  {t('analytics.skillsDistribution')}
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">Click on a skill bar to view resources</p>
              </div>
              <div className="flex items-center gap-2">
                <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
                <Select value={skillsSort} onValueChange={setSkillsSort}>
                  <SelectTrigger className="w-40 rounded-sm" data-testid="skills-sort">
                    <SelectValue placeholder="Sort by..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="count-desc">Count (High → Low)</SelectItem>
                    <SelectItem value="count-asc">Count (Low → High)</SelectItem>
                    <SelectItem value="a-z">Name (A → Z)</SelectItem>
                    <SelectItem value="z-a">Name (Z → A)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 pt-2">
            <div className="overflow-x-auto">
              <div style={{ minWidth: Math.max(sortedSkills.length * 60, 600), height: 350 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={sortedSkills} 
                    margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                  >
                    <XAxis 
                      dataKey="skill" 
                      angle={-45} 
                      textAnchor="end" 
                      height={80}
                      interval={0}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis />
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload[0]) {
                          return (
                            <div className="bg-white p-2 border border-border rounded shadow">
                              <p className="font-medium">{payload[0].payload.skill}</p>
                              <p className="text-sm">{payload[0].payload.count} resources</p>
                              <p className="text-xs text-blue-600 mt-1">Click to view →</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar 
                      dataKey="count" 
                      fill="#002FA7" 
                      radius={[4, 4, 0, 0]} 
                      cursor="pointer"
                      onClick={(data) => {
                        if (data && data.skill) {
                          navigate(`/resources?skill=${encodeURIComponent(data.skill)}`);
                        }
                      }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Showing {sortedSkills.length} skills • Scroll horizontally to see all
            </p>
          </CardContent>
        </Card>

        {/* Utilization by Resource Chart */}
        <Card className="border border-border rounded-sm shadow-sm" data-testid="chart-utilization">
          <CardHeader className="p-6 pb-2">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <CardTitle className="text-xl font-semibold" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  {t('analytics.utilizationByResource')}
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">Click on a bar to view resource allocations</p>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                {/* Filters */}
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-muted-foreground" />
                  <Select value={countryFilter} onValueChange={setCountryFilter}>
                    <SelectTrigger className="w-32 rounded-sm" data-testid="util-country-filter">
                      <SelectValue placeholder="Country" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Countries</SelectItem>
                      {uniqueCountries.map(country => (
                        <SelectItem key={country} value={country}>{country}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={zoneFilter} onValueChange={setZoneFilter}>
                    <SelectTrigger className="w-32 rounded-sm" data-testid="util-zone-filter">
                      <SelectValue placeholder="Zone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Zones</SelectItem>
                      {uniqueZones.map(zone => (
                        <SelectItem key={zone} value={zone}>{zone}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {/* Sorting */}
                <div className="flex items-center gap-2">
                  <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
                  <Select value={utilizationSort} onValueChange={setUtilizationSort}>
                    <SelectTrigger className="w-44 rounded-sm" data-testid="util-sort">
                      <SelectValue placeholder="Sort by..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="util-desc">Utilization (High → Low)</SelectItem>
                      <SelectItem value="util-asc">Utilization (Low → High)</SelectItem>
                      <SelectItem value="name-asc">Name (A → Z)</SelectItem>
                      <SelectItem value="name-desc">Name (Z → A)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 pt-2">
            {overallocatedCount > 0 && (
              <div className="mb-4 p-3 bg-destructive/10 border border-destructive rounded-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-destructive" />
                <p className="text-sm text-destructive">
                  {overallocatedCount} resource(s) overallocated in current view
                </p>
              </div>
            )}
            {filteredUtilization.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No resources match the current filters
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <div style={{ minWidth: Math.max(filteredUtilization.length * 80, 600), height: 350 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart 
                        data={filteredUtilization} 
                        margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                      >
                        <XAxis 
                          dataKey="resource_name" 
                          angle={-45} 
                          textAnchor="end" 
                          height={80}
                          interval={0}
                          tick={{ fontSize: 11 }}
                        />
                        <YAxis domain={[0, 'auto']} />
                        <Tooltip content={({ active, payload }) => {
                          if (active && payload && payload[0]) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-white p-2 border border-border rounded shadow">
                                <p className="font-medium">{data.resource_name}</p>
                                <p className="text-sm">Utilization: {data.utilization}%</p>
                                {data.country && <p className="text-xs text-muted-foreground">{data.country} {data.zone && `/ ${data.zone}`}</p>}
                                {data.is_overallocated && (
                                  <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                                    <AlertTriangle className="w-3 h-3" />
                                    Overallocated
                                  </p>
                                )}
                                <p className="text-xs text-blue-600 mt-1">Click to view allocations →</p>
                              </div>
                            );
                          }
                          return null;
                        }} />
                        <Bar 
                          dataKey="utilization" 
                          radius={[4, 4, 0, 0]} 
                          cursor="pointer"
                          onClick={(data) => {
                            if (data && data.resourceId) {
                              navigate(`/allocations?resource=${data.resourceId}&fromToday=true`);
                            }
                          }}
                        >
                          {filteredUtilization.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={getUtilizationColor(entry.utilization)} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Showing {filteredUtilization.length} of {utilization.length} resources • Scroll horizontally to see all
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Analytics;
