import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Plus, Edit, Trash2, Users, TrendingUp, Calendar } from 'lucide-react';
import { toast } from 'sonner';

const Projects = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [suggestionsDialogOpen, setSuggestionsDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [editingProject, setEditingProject] = useState(null);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [skillFilter, setSkillFilter] = useState('');
  const [dateRangeStart, setDateRangeStart] = useState('');
  const [dateRangeEnd, setDateRangeEnd] = useState('');
  
  // View project allocations on calendar
  const handleViewProjectCalendar = (projectId) => {
    navigate(`/allocations?project=${projectId}&fromToday=true`);
  };
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    start_date: '',
    end_date: '',
    status: 'planning',
    required_skills: '',
    resources_needed: 0,
    country: '',
    zone: ''
  });

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [projects, searchTerm, statusFilter, skillFilter, dateRangeStart, dateRangeEnd]);

  const applyFilters = () => {
    let filtered = [...projects];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(term) ||
        p.description.toLowerCase().includes(term)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => p.status === statusFilter);
    }

    // Skill filter
    if (skillFilter) {
      const skill = skillFilter.toLowerCase();
      filtered = filtered.filter(p => 
        p.required_skills.some(s => s.toLowerCase().includes(skill))
      );
    }

    // Date range filter
    if (dateRangeStart) {
      filtered = filtered.filter(p => p.start_date >= dateRangeStart);
    }
    if (dateRangeEnd) {
      filtered = filtered.filter(p => p.end_date <= dateRangeEnd);
    }

    setFilteredProjects(filtered);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setSkillFilter('');
    setDateRangeStart('');
    setDateRangeEnd('');
  };

  const fetchProjects = async () => {
    try {
      const response = await api.get('/projects');
      setProjects(response.data);
      setFilteredProjects(response.data);
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
      const data = {
        name: formData.name,
        description: formData.description,
        start_date: formData.start_date,
        end_date: formData.end_date,
        status: formData.status,
        required_skills: formData.required_skills.split(',').map(s => s.trim()).filter(Boolean),
        resources_needed: parseInt(formData.resources_needed) || 0,
        country: formData.country || '',
        zone: formData.zone || ''
      };
      
      if (editingProject) {
        await api.put(`/projects/${editingProject.id}`, data);
      } else {
        await api.post('/projects', data);
      }
      toast.success(t('common.success'));
      setDialogOpen(false);
      resetForm();
      fetchProjects();
    } catch (error) {
      console.error('Error:', error);
      toast.error(t('common.error'));
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure?')) {
      try {
        await api.delete(`/projects/${id}`);
        toast.success(t('common.success'));
        fetchProjects();
      } catch (error) {
        console.error('Error:', error);
        toast.error(t('common.error'));
      }
    }
  };

  const resetForm = () => {
    setFormData({ name: '', description: '', start_date: '', end_date: '', status: 'planning', required_skills: '', resources_needed: 0, country: '', zone: '' });
    setEditingProject(null);
  };

  const fetchSuggestions = async (projectId) => {
    try {
      const response = await api.get(`/projects/${projectId}/suggested-resources`);
      setSuggestions(response.data.suggested_resources || []);
      setSelectedProject(projects.find(p => p.id === projectId));
      setSuggestionsDialogOpen(true);
    } catch (error) {
      console.error('Error:', error);
      toast.error(t('common.error'));
    }
  };

  if (loading) return <div className="text-sm">{t('common.loading')}</div>;

  const getStatusColor = (status) => {
    const colors = {
      planning: '#F59E0B',
      active: '#10B981',
      completed: '#3B82F6',
      'on-hold': '#EF4444'
    };
    return colors[status] || '#CBD5E1';
  };

  return (
    <div data-testid="projects-page">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-4xl font-bold tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
            {t('projects.title')}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Showing {filteredProjects.length} of {projects.length} projects
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="rounded-sm" style={{ backgroundColor: '#002FA7' }} data-testid="add-project-button">
              <Plus className="w-4 h-4 mr-2" />
              {t('projects.addNew')}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingProject ? t('resources.edit') : t('projects.addNew')}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4" data-testid="project-form">
              <div>
                <Label>{t('projects.name')}</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  data-testid="input-project-name"
                />
              </div>
              <div>
                <Label>{t('projects.description')}</Label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                  data-testid="input-description"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t('projects.startDate')}</Label>
                  <Input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    required
                    data-testid="input-start-date"
                  />
                </div>
                <div>
                  <Label>{t('projects.endDate')}</Label>
                  <Input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    required
                    data-testid="input-end-date"
                  />
                </div>
              </div>
              <div>
                <Label>{t('projects.status')}</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger data-testid="select-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planning">{t('projects.planning')}</SelectItem>
                    <SelectItem value="active">{t('projects.active')}</SelectItem>
                    <SelectItem value="completed">{t('projects.completed')}</SelectItem>
                    <SelectItem value="on-hold">{t('projects.onHold')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Resources Needed</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.resources_needed}
                  onChange={(e) => setFormData({ ...formData, resources_needed: e.target.value })}
                  placeholder="Number of resources needed"
                  data-testid="input-resources-needed"
                />
              </div>
              <div>
                <Label>{t('projects.requiredSkills')} (comma separated)</Label>
                <Input
                  value={formData.required_skills}
                  onChange={(e) => setFormData({ ...formData, required_skills: e.target.value })}
                  placeholder="Python, React, AWS"
                  data-testid="input-required-skills"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Country</Label>
                  <Input
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    placeholder="e.g., Brazil, USA, Germany"
                    data-testid="input-project-country"
                  />
                </div>
                <div>
                  <Label>Zone</Label>
                  <Select value={formData.zone || 'none'} onValueChange={(value) => setFormData({ ...formData, zone: value === 'none' ? '' : value })}>
                    <SelectTrigger data-testid="select-project-zone">
                      <SelectValue placeholder="Select Zone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Zone</SelectItem>
                      <SelectItem value="LATAM">LATAM</SelectItem>
                      <SelectItem value="NA">NA (North America)</SelectItem>
                      <SelectItem value="EMEA">EMEA</SelectItem>
                      <SelectItem value="APAC">APAC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
                  {t('resources.cancel')}
                </Button>
                <Button type="submit" style={{ backgroundColor: '#002FA7' }} data-testid="save-project-button">
                  {t('resources.save')}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters Section */}
      <div className="mb-6 p-4 border border-border rounded-sm bg-muted/30" data-testid="projects-filters">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <Label className="text-xs mb-2">Search</Label>
            <Input
              placeholder="Project name, description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9"
              data-testid="search-projects"
            />
          </div>
          <div>
            <Label className="text-xs mb-2">Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9" data-testid="filter-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="planning">Planning</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="on-hold">On Hold</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs mb-2">Required Skills</Label>
            <Input
              placeholder="Filter by skill..."
              value={skillFilter}
              onChange={(e) => setSkillFilter(e.target.value)}
              className="h-9"
              data-testid="filter-project-skills"
            />
          </div>
          <div>
            <Label className="text-xs mb-2">Start After</Label>
            <Input
              type="date"
              value={dateRangeStart}
              onChange={(e) => setDateRangeStart(e.target.value)}
              className="h-9"
              data-testid="filter-start-date"
            />
          </div>
          <div>
            <Label className="text-xs mb-2">End Before</Label>
            <Input
              type="date"
              value={dateRangeEnd}
              onChange={(e) => setDateRangeEnd(e.target.value)}
              className="h-9"
              data-testid="filter-end-date"
            />
          </div>
        </div>
        <div className="flex justify-end mt-3">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={clearFilters}
            className="rounded-sm"
            data-testid="clear-project-filters"
          >
            Clear Filters
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-testid="projects-list">
        {filteredProjects.map((project) => (
          <Card key={project.id} className="border border-border rounded-sm shadow-sm p-6" data-testid={`project-card-${project.id}`}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-xl font-semibold mb-1" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  {project.name}
                </h3>
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="px-2 py-1 rounded text-xs font-medium"
                    style={{
                      backgroundColor: `${getStatusColor(project.status)}20`,
                      color: getStatusColor(project.status)
                    }}
                  >
                    {t(`projects.${project.status.replace('-', '')}`)}
                  </span>
                  {project.resources_needed > 0 && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {project.resources_needed} needed
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditingProject(project);
                    setFormData({
                      name: project.name,
                      description: project.description,
                      start_date: project.start_date,
                      end_date: project.end_date,
                      status: project.status,
                      required_skills: project.required_skills.join(', '),
                      resources_needed: project.resources_needed || 0,
                      country: project.country || '',
                      zone: project.zone || ''
                    });
                    setDialogOpen(true);
                  }}
                  className="h-8 w-8 p-0"
                  data-testid={`edit-project-${project.id}`}
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(project.id)}
                  className="h-8 w-8 p-0 text-destructive"
                  data-testid={`delete-project-${project.id}`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-4">{project.description}</p>
            <div className="text-xs text-muted-foreground space-y-1 mb-3">
              <p>{t('projects.startDate')}: {project.start_date}</p>
              <p>{t('projects.endDate')}: {project.end_date}</p>
              {project.required_skills && project.required_skills.length > 0 && (
                <div className="mt-2">
                  <p className="mb-1">Required Skills:</p>
                  <div className="flex flex-wrap gap-1">
                    {project.required_skills.map((skill, idx) => (
                      <span key={idx} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {project.required_skills && project.required_skills.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchSuggestions(project.id)}
                className="w-full rounded-sm mb-2"
                data-testid={`view-suggestions-${project.id}`}
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                View Suggested Resources
              </Button>
            )}
            <Button
              variant="default"
              size="sm"
              onClick={() => handleViewProjectCalendar(project.id)}
              className="w-full rounded-sm"
              style={{ backgroundColor: '#002FA7' }}
              data-testid={`view-calendar-${project.id}`}
            >
              <Calendar className="w-4 h-4 mr-2" />
              View Project Calendar
            </Button>
          </Card>
        ))}
      </div>

      {/* Suggestions Dialog */}
      <Dialog open={suggestionsDialogOpen} onOpenChange={setSuggestionsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Suggested Resources for {selectedProject?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {suggestions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No matching resources found</p>
            ) : (
              suggestions.map((item, idx) => (
                <Card key={idx} className="p-4 border border-border">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold">{item.resource.name}</h4>
                        <span className="px-2 py-0.5 bg-green-50 text-green-700 rounded text-xs font-medium">
                          {item.match_score}% Match
                        </span>
                        {item.is_overallocated && (
                          <span className="px-2 py-0.5 bg-destructive text-white rounded text-xs">
                            Overallocated
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">{item.resource.position} • {item.resource.location}</p>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {item.matching_skills.map((skill, sidx) => (
                          <span key={sidx} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">
                            {skill}
                          </span>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Available Capacity: {item.available_capacity}%
                      </p>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Projects;
