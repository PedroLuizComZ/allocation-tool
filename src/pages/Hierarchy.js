import React, { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Button } from '../components/ui/button';
import { Users, AlertTriangle, ChevronDown, ChevronRight, Search, Filter } from 'lucide-react';

const Hierarchy = () => {
  const { t } = useTranslation();
  const [hierarchy, setHierarchy] = useState([]);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});
  
  // Filter states
  const [nameFilter, setNameFilter] = useState('');
  const [countryFilter, setCountryFilter] = useState('all');
  const [zoneFilter, setZoneFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [hierarchyRes, resourcesRes] = await Promise.all([
        api.get('/hierarchy'),
        api.get('/resources')
      ]);
      setHierarchy(hierarchyRes.data.hierarchy || []);
      setResources(resourcesRes.data || []);
      
      // Auto-expand top 2 levels
      const initialExpanded = {};
      const markExpanded = (nodes, level) => {
        nodes.forEach(node => {
          if (level < 2) {
            initialExpanded[node.id] = true;
            if (node.direct_reports) {
              markExpanded(node.direct_reports, level + 1);
            }
          }
        });
      };
      markExpanded(hierarchyRes.data.hierarchy || [], 0);
      setExpanded(initialExpanded);
    } catch (error) {
      console.error('Error fetching data:', error);
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

  const uniqueDepartments = useMemo(() => {
    const departments = [...new Set(resources.map(r => r.department).filter(Boolean))];
    return departments.sort();
  }, [resources]);

  // Check if node matches filters
  const nodeMatchesFilters = (node) => {
    const resource = resources.find(r => r.id === node.id) || {};
    
    if (nameFilter && !node.name.toLowerCase().includes(nameFilter.toLowerCase())) {
      return false;
    }
    if (countryFilter !== 'all' && resource.country !== countryFilter) {
      return false;
    }
    if (zoneFilter !== 'all' && resource.zone !== zoneFilter) {
      return false;
    }
    if (departmentFilter !== 'all' && resource.department !== departmentFilter) {
      return false;
    }
    return true;
  };

  // Filter hierarchy recursively
  const filterHierarchy = (nodes) => {
    return nodes.map(node => {
      const filteredReports = node.direct_reports ? filterHierarchy(node.direct_reports) : [];
      const hasMatchingDescendants = filteredReports.length > 0;
      const matchesFilter = nodeMatchesFilters(node);
      
      if (matchesFilter || hasMatchingDescendants) {
        return {
          ...node,
          direct_reports: filteredReports,
          _highlighted: matchesFilter
        };
      }
      return null;
    }).filter(Boolean);
  };

  const filteredHierarchy = useMemo(() => {
    if (!nameFilter && countryFilter === 'all' && zoneFilter === 'all' && departmentFilter === 'all') {
      return hierarchy;
    }
    return filterHierarchy(hierarchy);
  }, [hierarchy, nameFilter, countryFilter, zoneFilter, departmentFilter, resources]);

  const clearFilters = () => {
    setNameFilter('');
    setCountryFilter('all');
    setZoneFilter('all');
    setDepartmentFilter('all');
  };

  const toggleExpand = (nodeId) => {
    setExpanded(prev => ({
      ...prev,
      [nodeId]: !prev[nodeId]
    }));
  };

  const renderNode = (node, level = 0) => {
    const hasReports = node.direct_reports && node.direct_reports.length > 0;
    const isExpanded = expanded[node.id];
    const isOverallocated = node.is_overallocated || node.allocation_percentage > 100;
    const resource = resources.find(r => r.id === node.id) || {};
    const isHighlighted = node._highlighted;

    return (
      <div key={node.id} className="mb-2">
        <Card 
          className={`border rounded-sm shadow-sm ${isOverallocated ? 'border-destructive' : isHighlighted ? 'border-blue-500 bg-blue-50' : 'border-border'}`}
          style={{ marginLeft: `${level * 24}px` }}
          data-testid={`hierarchy-node-${node.id}`}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                {hasReports ? (
                  <button
                    onClick={() => toggleExpand(node.id)}
                    className="w-6 h-6 flex items-center justify-center rounded hover:bg-accent"
                    data-testid={`expand-${node.id}`}
                  >
                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                ) : (
                  <div className="w-6" />
                )}
                
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold" style={{ fontFamily: 'Manrope, sans-serif' }}>
                      {node.name}
                    </h3>
                    <span className="px-2 py-0.5 text-xs border border-border rounded">
                      {t(`roles.${node.role}`)}
                    </span>
                    {resource.department && (
                      <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded">
                        {resource.department}
                      </span>
                    )}
                    {isOverallocated && (
                      <span className="px-2 py-0.5 text-xs bg-destructive text-white rounded flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {node.allocation_percentage}%
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{node.position}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{node.email}</span>
                    {(resource.country || resource.zone) && (
                      <>
                        <span>•</span>
                        <span>
                          {[resource.country, resource.zone].filter(Boolean).join(' / ')}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                
                {hasReports && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Users className="w-4 h-4" />
                    <span>{node.direct_reports.length}</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        
        {hasReports && isExpanded && (
          <div>
            {node.direct_reports.map((report) => renderNode(report, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) return <div className="text-sm">{t('common.loading')}</div>;

  return (
    <div data-testid="hierarchy-page">
      <div className="mb-6">
        <h1 className="text-4xl font-bold tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
          {t('hierarchy.title')}
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          View and manage organizational reporting structure
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 p-4 bg-muted/30 rounded-sm border border-border">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filters</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <Label className="text-xs text-muted-foreground">Name</Label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name..."
                value={nameFilter}
                onChange={(e) => setNameFilter(e.target.value)}
                className="pl-8 rounded-sm"
                data-testid="filter-hierarchy-name"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Country</Label>
            <Select value={countryFilter} onValueChange={setCountryFilter}>
              <SelectTrigger className="rounded-sm" data-testid="filter-hierarchy-country">
                <SelectValue placeholder="All Countries" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Countries</SelectItem>
                {uniqueCountries.map(country => (
                  <SelectItem key={country} value={country}>{country}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Zone</Label>
            <Select value={zoneFilter} onValueChange={setZoneFilter}>
              <SelectTrigger className="rounded-sm" data-testid="filter-hierarchy-zone">
                <SelectValue placeholder="All Zones" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Zones</SelectItem>
                {uniqueZones.map(zone => (
                  <SelectItem key={zone} value={zone}>{zone}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Department</Label>
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="rounded-sm" data-testid="filter-hierarchy-department">
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {uniqueDepartments.map(dept => (
                  <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={clearFilters}
              className="rounded-sm w-full"
              data-testid="clear-hierarchy-filters"
            >
              Clear Filters
            </Button>
          </div>
        </div>
      </div>

      {filteredHierarchy.length === 0 ? (
        <Card className="border border-border rounded-sm shadow-sm">
          <CardContent className="p-6 text-center text-muted-foreground">
            <p>No matching resources found. Try adjusting your filters.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredHierarchy.map((node) => renderNode(node))}
        </div>
      )}
    </div>
  );
};

export default Hierarchy;
