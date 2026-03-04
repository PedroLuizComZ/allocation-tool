import React, { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Plus, Trash2, Filter, Calendar, Users, Clock, Search, CalendarDays } from 'lucide-react';
import { toast } from 'sonner';

const ResourceLeaves = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [leaves, setLeaves] = useState([]);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  // Filter states
  const [resourceFilter, setResourceFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all'); // all, upcoming, past, current
  const [searchTerm, setSearchTerm] = useState('');
  
  const [formData, setFormData] = useState({
    resource_id: '',
    start_date: '',
    end_date: '',
    leave_type: 'vacation',
    notes: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [leavesRes, resourcesRes] = await Promise.all([
        api.get('/leaves'),
        api.get('/resources')
      ]);
      setLeaves(leavesRes.data || []);
      setResources(resourcesRes.data || []);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error loading data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/leaves', formData);
      toast.success('Leave recorded successfully');
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error:', error);
      toast.error(error.response?.data?.detail || 'Error creating leave');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this leave record?')) {
      try {
        await api.delete(`/leaves/${id}`);
        toast.success('Leave deleted');
        fetchData();
      } catch (error) {
        console.error('Error:', error);
        toast.error('Error deleting leave');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      resource_id: '',
      start_date: '',
      end_date: '',
      leave_type: 'vacation',
      notes: ''
    });
  };

  const getResourceName = (id) => resources.find(r => r.id === id)?.name || id;
  const getResource = (id) => resources.find(r => r.id === id);

  const calculateDays = (start, end) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
    return days;
  };

  const getLeaveTypeColor = (type) => {
    switch (type) {
      case 'vacation': return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' };
      case 'sick': return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' };
      case 'personal': return { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' };
      case 'public_holiday': return { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' };
      default: return { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' };
    }
  };

  const getDateStatus = (start, end) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = new Date(start);
    const endDate = new Date(end);
    
    if (endDate < today) return 'past';
    if (startDate > today) return 'upcoming';
    return 'current';
  };

  // Filter leaves
  const filteredLeaves = useMemo(() => {
    let filtered = [...leaves];
    
    if (resourceFilter !== 'all') {
      filtered = filtered.filter(l => l.resource_id === resourceFilter);
    }
    
    if (typeFilter !== 'all') {
      filtered = filtered.filter(l => l.leave_type === typeFilter);
    }
    
    if (dateFilter !== 'all') {
      filtered = filtered.filter(l => getDateStatus(l.start_date, l.end_date) === dateFilter);
    }
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(l => {
        const resourceName = getResourceName(l.resource_id).toLowerCase();
        return resourceName.includes(term) || l.notes?.toLowerCase().includes(term);
      });
    }
    
    // Sort by start date (most recent first)
    filtered.sort((a, b) => new Date(b.start_date) - new Date(a.start_date));
    
    return filtered;
  }, [leaves, resourceFilter, typeFilter, dateFilter, searchTerm, resources]);

  // Calculate stats
  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const upcoming = leaves.filter(l => new Date(l.start_date) > today).length;
    const current = leaves.filter(l => {
      const start = new Date(l.start_date);
      const end = new Date(l.end_date);
      return start <= today && end >= today;
    }).length;
    const totalDays = leaves.reduce((sum, l) => sum + calculateDays(l.start_date, l.end_date), 0);
    
    return { upcoming, current, totalDays, total: leaves.length };
  }, [leaves]);

  const clearFilters = () => {
    setResourceFilter('all');
    setTypeFilter('all');
    setDateFilter('all');
    setSearchTerm('');
  };

  // Navigate to calendar with resource filter
  const handleViewCalendar = (resourceId) => {
    navigate(`/allocations?resource=${resourceId}&fromToday=true`);
  };

  if (loading) return <div className="text-sm">Loading...</div>;

  return (
    <div data-testid="leaves-page">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-4xl font-bold tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Resource Leaves & Time Off
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Track vacations, sick leave, and other time off
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="rounded-sm" style={{ backgroundColor: '#002FA7' }} data-testid="add-leave-button">
              <Plus className="w-4 h-4 mr-2" />
              Record Leave
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record Leave/Time Off</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4" data-testid="leave-form">
              <div>
                <Label>Resource</Label>
                <Select value={formData.resource_id} onValueChange={(value) => setFormData({ ...formData, resource_id: value })}>
                  <SelectTrigger data-testid="select-leave-resource">
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
                <Label>Leave Type</Label>
                <Select value={formData.leave_type} onValueChange={(value) => setFormData({ ...formData, leave_type: value })}>
                  <SelectTrigger data-testid="select-leave-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vacation">🏖️ Vacation</SelectItem>
                    <SelectItem value="sick">🏥 Sick Leave</SelectItem>
                    <SelectItem value="personal">👤 Personal Leave</SelectItem>
                    <SelectItem value="public_holiday">🎉 Public Holiday</SelectItem>
                    <SelectItem value="other">📝 Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    required
                    data-testid="input-leave-start"
                  />
                </div>
                <div>
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    required
                    data-testid="input-leave-end"
                  />
                </div>
              </div>
              {formData.start_date && formData.end_date && (
                <div className="p-3 bg-muted rounded-sm text-sm">
                  <Clock className="w-4 h-4 inline mr-2" />
                  Duration: <strong>{calculateDays(formData.start_date, formData.end_date)} day(s)</strong>
                </div>
              )}
              <div>
                <Label>Notes (Optional)</Label>
                <Input
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional information..."
                  data-testid="input-leave-notes"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
                  Cancel
                </Button>
                <Button type="submit" style={{ backgroundColor: '#002FA7' }} data-testid="save-leave-button">
                  Save Leave
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="border border-border rounded-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-sm">
                <CalendarDays className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold" style={{ fontFamily: 'Manrope, sans-serif' }}>{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total Records</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-border rounded-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-sm">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold" style={{ fontFamily: 'Manrope, sans-serif' }}>{stats.current}</p>
                <p className="text-xs text-muted-foreground">Currently Off</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-border rounded-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-sm">
                <Calendar className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold" style={{ fontFamily: 'Manrope, sans-serif' }}>{stats.upcoming}</p>
                <p className="text-xs text-muted-foreground">Upcoming</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-border rounded-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-sm">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold" style={{ fontFamily: 'Manrope, sans-serif' }}>{stats.totalDays}</p>
                <p className="text-xs text-muted-foreground">Total Days</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="mb-6 p-4 bg-muted/30 rounded-sm border border-border">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filters</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <Label className="text-xs text-muted-foreground">Search</Label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 rounded-sm"
                data-testid="filter-leaves-search"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Resource</Label>
            <Select value={resourceFilter} onValueChange={setResourceFilter}>
              <SelectTrigger className="rounded-sm" data-testid="filter-leaves-resource">
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
          <div>
            <Label className="text-xs text-muted-foreground">Type</Label>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="rounded-sm" data-testid="filter-leaves-type">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="vacation">Vacation</SelectItem>
                <SelectItem value="sick">Sick Leave</SelectItem>
                <SelectItem value="personal">Personal Leave</SelectItem>
                <SelectItem value="public_holiday">Public Holiday</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Status</Label>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="rounded-sm" data-testid="filter-leaves-status">
                <SelectValue placeholder="All Dates" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Dates</SelectItem>
                <SelectItem value="current">Currently Off</SelectItem>
                <SelectItem value="upcoming">Upcoming</SelectItem>
                <SelectItem value="past">Past</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={clearFilters}
              className="rounded-sm w-full"
              data-testid="clear-leaves-filters"
            >
              Clear Filters
            </Button>
          </div>
        </div>
      </div>

      {/* Leaves List */}
      <div className="space-y-3" data-testid="leaves-list">
        {filteredLeaves.length === 0 ? (
          <Card className="border border-border rounded-sm">
            <CardContent className="p-6 text-center text-muted-foreground">
              {leaves.length === 0 
                ? 'No leaves recorded yet. Click "Record Leave" to add time off.'
                : 'No leaves match the current filters.'}
            </CardContent>
          </Card>
        ) : (
          filteredLeaves.map((leave) => {
            const days = calculateDays(leave.start_date, leave.end_date);
            const status = getDateStatus(leave.start_date, leave.end_date);
            const colors = getLeaveTypeColor(leave.leave_type);
            const resource = getResource(leave.resource_id);
            
            return (
              <Card 
                key={leave.id} 
                className={`border rounded-sm shadow-sm ${status === 'current' ? 'border-amber-300 bg-amber-50/30' : 'border-border'}`}
                data-testid={`leave-card-${leave.id}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-6 gap-4 items-center">
                      <div className="md:col-span-2">
                        <p className="text-sm font-medium">{getResourceName(leave.resource_id)}</p>
                        <p className="text-xs text-muted-foreground">
                          {resource?.position} {resource?.department && `• ${resource.department}`}
                        </p>
                      </div>
                      <div>
                        <span className={`px-2 py-1 rounded text-xs capitalize ${colors.bg} ${colors.text}`}>
                          {leave.leave_type.replace('_', ' ')}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium">{days} day{days !== 1 ? 's' : ''}</p>
                        <p className="text-xs text-muted-foreground">
                          {status === 'current' && <span className="text-amber-600 font-medium">Currently Off</span>}
                          {status === 'upcoming' && <span className="text-green-600">Upcoming</span>}
                          {status === 'past' && <span className="text-gray-500">Completed</span>}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm">{leave.start_date}</p>
                        <p className="text-xs text-muted-foreground">→ {leave.end_date}</p>
                      </div>
                      <div className="flex items-center gap-2 justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewCalendar(leave.resource_id)}
                          className="h-8 rounded-sm text-xs"
                          data-testid={`view-calendar-${leave.id}`}
                        >
                          <Calendar className="w-3 h-3 mr-1" />
                          Calendar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(leave.id)}
                          className="h-8 w-8 p-0 text-destructive"
                          data-testid={`delete-leave-${leave.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  {leave.notes && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <p className="text-xs text-muted-foreground">📝 {leave.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
      
      {filteredLeaves.length > 0 && (
        <p className="text-xs text-muted-foreground mt-4 text-center">
          Showing {filteredLeaves.length} of {leaves.length} leave records
        </p>
      )}
    </div>
  );
};

export default ResourceLeaves;
