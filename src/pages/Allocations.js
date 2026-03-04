import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Plus, Trash2, Calendar, List, AlertTriangle, ChevronLeft, ChevronRight, FastForward, User } from 'lucide-react';
import { toast } from 'sonner';
import { Calendar as BigCalendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, addMonths, subMonths, addDays, isAfter, isBefore, parseISO } from 'date-fns';
import 'react-big-calendar/lib/css/react-big-calendar.css';

// Setup date-fns localizer for react-big-calendar
const locales = {
  'en-US': require('date-fns/locale/en-US'),
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

const Allocations = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [allocations, setAllocations] = useState([]);
  const [resources, setResources] = useState([]);
  const [projects, setProjects] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState('calendar'); // 'list' or 'calendar'
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedResource, setSelectedResource] = useState('all');
  const [selectedProject, setSelectedProject] = useState('all');
  const [closestAvailableDay, setClosestAvailableDay] = useState(null);
  const [formData, setFormData] = useState({
    resource_id: '',
    project_id: '',
    allocation_percentage: 50,
    start_date: '',
    end_date: '',
    role: 'Engineer'
  });

  // Handle URL parameters for filtering
  useEffect(() => {
    const resourceParam = searchParams.get('resource');
    const projectParam = searchParams.get('project');
    const fromToday = searchParams.get('fromToday');
    
    if (resourceParam) {
      setSelectedResource(resourceParam);
    }
    if (projectParam) {
      setSelectedProject(projectParam);
    }
    if (fromToday === 'true') {
      setCurrentDate(new Date());
    }
  }, [searchParams]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [allocRes, resRes, projRes, leavesRes] = await Promise.all([
        api.get('/allocations'),
        api.get('/resources'),
        api.get('/projects'),
        api.get('/leaves')
      ]);
      setAllocations(allocRes.data);
      setResources(resRes.data);
      setProjects(projRes.data);
      setLeaves(leavesRes.data || []);
    } catch (error) {
      console.error('Error:', error);
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/allocations', formData);
      if (response.data.warning) {
        toast.warning(response.data.warning);
      } else {
        toast.success(t('common.success'));
      }
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error:', error);
      toast.error(error.response?.data?.detail || t('common.error'));
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure?')) {
      try {
        await api.delete(`/allocations/${id}`);
        toast.success(t('common.success'));
        fetchData();
      } catch (error) {
        console.error('Error:', error);
        toast.error(t('common.error'));
      }
    }
  };

  const resetForm = () => {
    setFormData({
      resource_id: '',
      project_id: '',
      allocation_percentage: 50,
      start_date: '',
      end_date: '',
      role: 'Engineer'
    });
  };

  const getResourceName = (id) => resources.find(r => r.id === id)?.name || id;
  const getProjectName = (id) => projects.find(p => p.id === id)?.name || id;
  const getResourceUtilization = (resourceId) => {
    const total = allocations
      .filter(a => a.resource_id === resourceId)
      .reduce((sum, a) => sum + a.allocation_percentage, 0);
    return total;
  };

  // Calculate closest available day for selected resource
  useEffect(() => {
    if (selectedResource !== 'all') {
      const resourceAllocs = allocations.filter(a => a.resource_id === selectedResource);
      const resourceLeaves = leaves.filter(l => l.resource_id === selectedResource);
      
      // Find days with utilization < 100%
      const today = new Date();
      let checkDate = today;
      let foundAvailable = null;
      
      for (let i = 0; i < 365; i++) {
        checkDate = addDays(today, i);
        const dateStr = format(checkDate, 'yyyy-MM-dd');
        
        // Check if on leave
        const onLeave = resourceLeaves.some(l => {
          const start = parseISO(l.start_date);
          const end = parseISO(l.end_date);
          return !isBefore(checkDate, start) && !isAfter(checkDate, end);
        });
        
        if (onLeave) continue;
        
        // Calculate utilization for this day
        let dayUtil = 0;
        resourceAllocs.forEach(a => {
          const start = parseISO(a.start_date);
          const end = parseISO(a.end_date);
          if (!isBefore(checkDate, start) && !isAfter(checkDate, end)) {
            dayUtil += a.allocation_percentage;
          }
        });
        
        if (dayUtil < 100) {
          foundAvailable = checkDate;
          break;
        }
      }
      
      setClosestAvailableDay(foundAvailable);
    } else {
      setClosestAvailableDay(null);
    }
  }, [selectedResource, allocations, leaves]);

  // Jump to closest available day
  const handleJumpToAvailable = () => {
    if (closestAvailableDay) {
      setCurrentDate(closestAvailableDay);
      toast.success(`Jumped to ${format(closestAvailableDay, 'MMMM d, yyyy')}`);
    }
  };

  // Handle resource name click - navigate to resource allocations
  const handleResourceClick = (resourceId) => {
    setSelectedResource(resourceId);
    setSelectedProject('all');
    // Update URL
    navigate(`/allocations?resource=${resourceId}&fromToday=true`);
  };

  // Check if resource is in different location than project
  const getLocationMismatch = (resource, project) => {
    if (!resource || !project) return null;
    const resourceCountry = resource.country || '';
    const resourceZone = resource.zone || '';
    const projectCountry = project.country || '';
    const projectZone = project.zone || '';
    
    if (projectCountry && resourceCountry && projectCountry !== resourceCountry) {
      return { type: 'country', from: resourceCountry, to: projectCountry };
    }
    if (projectZone && resourceZone && projectZone !== resourceZone) {
      return { type: 'zone', from: resourceZone, to: projectZone };
    }
    return null;
  };

  // Convert allocations and leaves to calendar events
  const calendarEvents = useMemo(() => {
    const events = [];
    
    // Filter allocations by selected resource and project
    let filteredAllocations = allocations;
    if (selectedResource !== 'all') {
      filteredAllocations = filteredAllocations.filter(a => a.resource_id === selectedResource);
    }
    if (selectedProject !== 'all') {
      filteredAllocations = filteredAllocations.filter(a => a.project_id === selectedProject);
    }
    
    // Calculate resource utilization for overallocation coloring
    const resourceUtilMap = {};
    allocations.forEach(a => {
      if (!resourceUtilMap[a.resource_id]) resourceUtilMap[a.resource_id] = 0;
      resourceUtilMap[a.resource_id] += a.allocation_percentage;
    });
    
    // Add allocation events
    filteredAllocations.forEach(alloc => {
      const resource = resources.find(r => r.id === alloc.resource_id);
      const project = projects.find(p => p.id === alloc.project_id);
      const isOverallocated = resourceUtilMap[alloc.resource_id] > 100;
      const locationMismatch = getLocationMismatch(resource, project);
      
      // Build title with location indicator
      let title = `${resource?.name || 'Unknown'} - ${project?.name || 'Unknown'} (${alloc.allocation_percentage}%)`;
      if (locationMismatch) {
        title += ` 📍${locationMismatch.to}`;
      }
      if (isOverallocated) {
        title = `⚠️ ${title}`;
      }
      
      events.push({
        id: alloc.id,
        title,
        start: new Date(alloc.start_date),
        end: new Date(alloc.end_date),
        allDay: true,
        type: 'allocation',
        resource: resource,
        project: project,
        allocation: alloc,
        isOverallocated,
        locationMismatch,
        color: isOverallocated ? '#EF4444' : (alloc.allocation_percentage > 50 ? '#3B82F6' : '#10B981')
      });
    });
    
    // Filter leaves by selected resource
    const filteredLeaves = selectedResource === 'all' 
      ? leaves 
      : leaves.filter(l => l.resource_id === selectedResource);
    
    // Add leave events
    filteredLeaves.forEach(leave => {
      const resource = resources.find(r => r.id === leave.resource_id);
      
      events.push({
        id: `leave-${leave.id}`,
        title: `🏖️ ${resource?.name || 'Unknown'} - ${leave.leave_type}`,
        start: new Date(leave.start_date),
        end: new Date(leave.end_date),
        allDay: true,
        type: 'leave',
        resource: resource,
        leave: leave,
        color: '#F59E0B'
      });
    });
    
    return events;
  }, [allocations, leaves, resources, projects, selectedResource, selectedProject]);

  // Custom event styling
  const eventStyleGetter = useCallback((event) => {
    let backgroundColor = event.color || '#3B82F6';
    let borderColor = backgroundColor;
    
    if (event.type === 'leave') {
      backgroundColor = '#FEF3C7';
      borderColor = '#F59E0B';
      return {
        style: {
          backgroundColor,
          borderLeft: `3px solid ${borderColor}`,
          color: '#92400E',
          borderRadius: '4px',
          fontSize: '11px',
          padding: '2px 4px'
        }
      };
    }
    
    // Style for overallocated resources
    if (event.isOverallocated) {
      return {
        style: {
          backgroundColor: '#FEE2E2',
          borderLeft: '3px solid #EF4444',
          color: '#991B1B',
          borderRadius: '4px',
          fontSize: '11px',
          padding: '2px 4px',
          fontWeight: '500'
        }
      };
    }
    
    // Style for location mismatch
    if (event.locationMismatch) {
      return {
        style: {
          backgroundColor,
          borderLeft: '3px solid #8B5CF6',
          borderRadius: '4px',
          border: 'none',
          color: 'white',
          fontSize: '11px',
          padding: '2px 4px'
        }
      };
    }
    
    return {
      style: {
        backgroundColor,
        borderRadius: '4px',
        border: 'none',
        color: 'white',
        fontSize: '11px',
        padding: '2px 4px'
      }
    };
  }, []);

  // Navigate calendar
  const handleNavigate = (action) => {
    if (action === 'PREV') {
      setCurrentDate(subMonths(currentDate, 1));
    } else if (action === 'NEXT') {
      setCurrentDate(addMonths(currentDate, 1));
    } else if (action === 'TODAY') {
      setCurrentDate(new Date());
    }
  };

  if (loading) return <div className="text-sm">{t('common.loading')}</div>;

  // Group allocations by resource for list view
  const allocationsByResource = {};
  resources.forEach(resource => {
    const resourceAllocations = allocations.filter(a => a.resource_id === resource.id);
    if (resourceAllocations.length > 0) {
      allocationsByResource[resource.id] = {
        resource,
        allocations: resourceAllocations,
        utilization: getResourceUtilization(resource.id)
      };
    }
  });

  return (
    <div data-testid="allocations-page">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-4xl font-bold tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
            {t('allocations.title')}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Total Allocations: {allocations.length}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            onClick={() => setViewMode('list')}
            className="rounded-sm"
            data-testid="list-view-btn"
          >
            <List className="w-4 h-4 mr-2" />
            List View
          </Button>
          <Button
            variant={viewMode === 'calendar' ? 'default' : 'outline'}
            onClick={() => setViewMode('calendar')}
            className="rounded-sm"
            data-testid="calendar-view-btn"
          >
            <Calendar className="w-4 h-4 mr-2" />
            Calendar View
          </Button>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="rounded-sm" style={{ backgroundColor: '#002FA7' }} data-testid="add-allocation-button">
                <Plus className="w-4 h-4 mr-2" />
                {t('allocations.addNew')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('allocations.addNew')}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4" data-testid="allocation-form">
                <div>
                  <Label>{t('allocations.resource')}</Label>
                  <Select value={formData.resource_id} onValueChange={(value) => setFormData({ ...formData, resource_id: value })}>
                    <SelectTrigger data-testid="select-resource">
                      <SelectValue placeholder="Select resource" />
                    </SelectTrigger>
                    <SelectContent>
                      {resources.map(r => (
                        <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t('allocations.project')}</Label>
                  <Select value={formData.project_id} onValueChange={(value) => setFormData({ ...formData, project_id: value })}>
                    <SelectTrigger data-testid="select-project">
                      <SelectValue placeholder="Select project" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t('allocations.percentage')}</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.allocation_percentage}
                    onChange={(e) => setFormData({ ...formData, allocation_percentage: parseInt(e.target.value) })}
                    required
                    data-testid="input-percentage"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{t('allocations.startDate')}</Label>
                    <Input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      required
                      data-testid="input-alloc-start-date"
                    />
                  </div>
                  <div>
                    <Label>{t('allocations.endDate')}</Label>
                    <Input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      required
                      data-testid="input-alloc-end-date"
                    />
                  </div>
                </div>
                <div>
                  <Label>{t('allocations.role')}</Label>
                  <Input
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    required
                    data-testid="input-role"
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
                    {t('resources.cancel')}
                  </Button>
                  <Button type="submit" style={{ backgroundColor: '#002FA7' }} data-testid="save-allocation-button">
                    {t('resources.save')}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {viewMode === 'calendar' ? (
        <Card className="border border-border rounded-sm shadow-sm" data-testid="calendar-container">
          <CardHeader className="p-4 border-b border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleNavigate('PREV')} className="rounded-sm">
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleNavigate('TODAY')} className="rounded-sm">
                    Today
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleNavigate('NEXT')} className="rounded-sm">
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
                <h2 className="text-xl font-semibold" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  {format(currentDate, 'MMMM yyyy')}
                </h2>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Label className="text-sm">Resource:</Label>
                  <Select value={selectedResource} onValueChange={setSelectedResource}>
                    <SelectTrigger className="w-40" data-testid="filter-resource">
                      <SelectValue placeholder="All Resources" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Resources</SelectItem>
                      {resources.map(r => (
                        <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-sm">Project:</Label>
                  <Select value={selectedProject} onValueChange={setSelectedProject}>
                    <SelectTrigger className="w-40" data-testid="filter-project">
                      <SelectValue placeholder="All Projects" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Projects</SelectItem>
                      {projects.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {/* Jump to Available Day button - only shown when resource is selected */}
                {selectedResource !== 'all' && closestAvailableDay && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleJumpToAvailable}
                    className="rounded-sm bg-green-50 border-green-300 text-green-700 hover:bg-green-100"
                    data-testid="jump-to-available"
                  >
                    <FastForward className="w-4 h-4 mr-2" />
                    Jump to Available ({format(closestAvailableDay, 'MMM d')})
                  </Button>
                )}
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-sm bg-blue-500"></span>
                    Normal
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-sm bg-red-100 border-l-2 border-red-500"></span>
                    Overallocated
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-sm bg-amber-100 border-l-2 border-amber-500"></span>
                    Leave
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-sm bg-blue-500 border-l-2 border-purple-500"></span>
                    📍 Diff. Location
                  </span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            {/* Selected resource info */}
            {selectedResource !== 'all' && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-sm flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-700">
                    Viewing: {resources.find(r => r.id === selectedResource)?.name}
                  </span>
                  <span className="text-xs text-blue-500">
                    ({getResourceUtilization(selectedResource)}% utilized)
                  </span>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => { setSelectedResource('all'); navigate('/allocations'); }}
                  className="text-blue-600"
                >
                  Clear Filter
                </Button>
              </div>
            )}
            <div style={{ height: 600 }}>
              <BigCalendar
                localizer={localizer}
                events={calendarEvents}
                startAccessor="start"
                endAccessor="end"
                date={currentDate}
                onNavigate={setCurrentDate}
                views={['month']}
                defaultView="month"
                eventPropGetter={eventStyleGetter}
                toolbar={false}
                popup
                selectable
                onSelectEvent={(event) => {
                  if (event.type === 'allocation') {
                    // Show toast with option to filter by resource
                    toast(
                      <div className="flex flex-col gap-2">
                        <p className="text-sm">{event.resource?.name} allocated to {event.project?.name} at {event.allocation?.allocation_percentage}%</p>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleResourceClick(event.resource?.id)}
                          className="text-xs"
                        >
                          <User className="w-3 h-3 mr-1" />
                          View {event.resource?.name}'s allocations
                        </Button>
                      </div>
                    );
                  } else if (event.type === 'leave') {
                    toast.info(`${event.resource?.name} on ${event.leave?.leave_type}: ${event.leave?.notes || 'No notes'}`);
                  }
                }}
                style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
              />
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4" data-testid="allocations-list">
          {allocations.length === 0 ? (
            <Card className="border border-border rounded-sm shadow-sm">
              <CardContent className="p-6 text-center text-muted-foreground">
                <p>No allocations found. Create your first allocation to get started.</p>
              </CardContent>
            </Card>
          ) : (
            allocations.map((allocation) => {
              const resourceUtil = getResourceUtilization(allocation.resource_id);
              return (
                <Card key={allocation.id} className="border border-border rounded-sm shadow-sm" data-testid={`allocation-card-${allocation.id}`}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">{t('allocations.resource')}</p>
                          <p className="text-sm font-medium">{getResourceName(allocation.resource_id)}</p>
                          {resourceUtil > 100 && (
                            <span className="text-xs text-destructive flex items-center gap-1 mt-1">
                              <AlertTriangle className="w-3 h-3" />
                              {resourceUtil}% utilized
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">{t('allocations.project')}</p>
                          <p className="text-sm font-medium">{getProjectName(allocation.project_id)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">{t('allocations.percentage')}</p>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-primary"
                                style={{ width: `${Math.min(allocation.allocation_percentage, 100)}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium">{allocation.allocation_percentage}%</span>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">{t('allocations.role')}</p>
                          <p className="text-sm font-medium">{allocation.role}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Period</p>
                          <p className="text-sm">{allocation.start_date}</p>
                          <p className="text-sm">→ {allocation.end_date}</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(allocation.id)}
                        className="h-8 w-8 p-0 text-destructive"
                        data-testid={`delete-allocation-${allocation.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default Allocations;
