import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Checkbox } from '../components/ui/checkbox';
import { Plus, Edit, Trash2, Filter } from 'lucide-react';
import { toast } from 'sonner';

const Resources = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [resources, setResources] = useState([]);
  const [filteredResources, setFilteredResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingResource, setEditingResource] = useState(null);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [locationFilter, setLocationFilter] = useState('all');
  const [positionFilter, setPositionFilter] = useState('all');
  const [skillFilter, setSkillFilter] = useState('');
  const [managerFilter, setManagerFilter] = useState('all');
  
  // Handle URL skill parameter
  useEffect(() => {
    const skillParam = searchParams.get('skill');
    if (skillParam) {
      setSkillFilter(skillParam);
    }
  }, [searchParams]);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    position: '',
    department: '',
    role: 'user',
    is_line_manager: false,
    line_manager_id: '',
    location: '',
    country: '',
    zone: '',
    availability: 100,
    hard_skills: '',
    soft_skills: '',
    language_skills: '',
    technical_skills: ''
  });

  useEffect(() => {
    fetchResources();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [resources, searchTerm, locationFilter, positionFilter, skillFilter, managerFilter]);

  const applyFilters = () => {
    let filtered = [...resources];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(r => 
        r.name.toLowerCase().includes(term) ||
        r.email.toLowerCase().includes(term) ||
        r.position.toLowerCase().includes(term)
      );
    }

    // Location filter
    if (locationFilter !== 'all') {
      filtered = filtered.filter(r => r.location === locationFilter);
    }

    // Position/Function filter
    if (positionFilter !== 'all') {
      filtered = filtered.filter(r => r.position === positionFilter);
    }

    // Skill filter
    if (skillFilter) {
      const skill = skillFilter.toLowerCase();
      filtered = filtered.filter(r => 
        r.hard_skills.some(s => s.toLowerCase().includes(skill)) ||
        r.soft_skills.some(s => s.toLowerCase().includes(skill)) ||
        r.technical_skills.some(s => s.toLowerCase().includes(skill)) ||
        r.language_skills.some(s => s.toLowerCase().includes(skill))
      );
    }

    // Manager filter
    if (managerFilter !== 'all') {
      filtered = filtered.filter(r => r.line_manager_id === managerFilter);
    }

    setFilteredResources(filtered);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setLocationFilter('all');
    setPositionFilter('all');
    setSkillFilter('');
    setManagerFilter('all');
  };

  const fetchResources = async () => {
    try {
      const response = await api.get('/resources');
      setResources(response.data);
      setFilteredResources(response.data);
    } catch (error) {
      console.error('Error fetching resources:', error);
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        ...formData,
        role: formData.is_line_manager ? 'manager' : 'user',
        line_manager_id: formData.line_manager_id || null,
        department: formData.department || '',
        country: formData.country || '',
        zone: formData.zone || '',
        hard_skills: formData.hard_skills.split(',').map(s => s.trim()).filter(Boolean),
        soft_skills: formData.soft_skills.split(',').map(s => s.trim()).filter(Boolean),
        language_skills: formData.language_skills.split(',').map(s => s.trim()).filter(Boolean),
        technical_skills: formData.technical_skills.split(',').map(s => s.trim()).filter(Boolean),
      };
      delete data.is_line_manager;

      if (editingResource) {
        await api.put(`/resources/${editingResource.id}`, data);
        toast.success(t('common.success'));
      } else {
        await api.post('/resources', data);
        toast.success(t('common.success'));
      }
      
      setDialogOpen(false);
      resetForm();
      fetchResources();
    } catch (error) {
      console.error('Error saving resource:', error);
      toast.error(t('common.error'));
    }
  };

  const handleEdit = (resource) => {
    setEditingResource(resource);
    setFormData({
      name: resource.name,
      email: resource.email,
      position: resource.position,
      department: resource.department || '',
      role: resource.role || 'user',
      is_line_manager: resource.role === 'manager' || resource.role === 'admin',
      line_manager_id: resource.line_manager_id || '',
      location: resource.location,
      country: resource.country || '',
      zone: resource.zone || '',
      availability: resource.availability,
      hard_skills: resource.hard_skills.join(', '),
      soft_skills: resource.soft_skills.join(', '),
      language_skills: resource.language_skills.join(', '),
      technical_skills: resource.technical_skills.join(', ')
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure?')) {
      try {
        await api.delete(`/resources/${id}`);
        toast.success(t('common.success'));
        fetchResources();
      } catch (error) {
        console.error('Error deleting resource:', error);
        toast.error(t('common.error'));
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      position: '',
      department: '',
      role: 'user',
      is_line_manager: false,
      line_manager_id: '',
      location: '',
      country: '',
      zone: '',
      availability: 100,
      hard_skills: '',
      soft_skills: '',
      language_skills: '',
      technical_skills: ''
    });
    setEditingResource(null);
  };

  if (loading) {
    return <div className="text-sm">{t('common.loading')}</div>;
  }

  const uniqueLocations = [...new Set(resources.map(r => r.location))];
  const uniquePositions = [...new Set(resources.map(r => r.position))];
  const uniqueManagers = resources.filter(r => r.role === 'manager' || r.role === 'admin');

  return (
    <div data-testid="resources-page">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-4xl font-bold tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }} data-testid="resources-title">
            {t('resources.title')}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Showing {filteredResources.length} of {resources.length} resources
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="rounded-sm" style={{ backgroundColor: '#002FA7' }} data-testid="add-resource-button">
              <Plus className="w-4 h-4 mr-2" />
              {t('resources.addNew')}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingResource ? t('resources.edit') : t('resources.addNew')}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4" data-testid="resource-form">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t('resources.name')}</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    data-testid="input-name"
                  />
                </div>
                <div>
                  <Label>{t('resources.email')}</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    data-testid="input-email"
                  />
                </div>
                <div>
                  <Label>{t('resources.position')}</Label>
                  <Input
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    required
                    data-testid="input-position"
                  />
                </div>
                <div>
                  <Label>{t('resources.location')}</Label>
                  <Input
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    required
                    data-testid="input-location"
                  />
                </div>
                <div>
                  <Label>Country</Label>
                  <Input
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    placeholder="e.g., Brazil, USA, Germany"
                    data-testid="input-country"
                  />
                </div>
                <div>
                  <Label>Zone</Label>
                  <Select value={formData.zone || 'none'} onValueChange={(value) => setFormData({ ...formData, zone: value === 'none' ? '' : value })}>
                    <SelectTrigger data-testid="select-zone">
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
                <div className="col-span-2">
                  <Label>Department</Label>
                  <Select value={formData.department || 'none'} onValueChange={(value) => setFormData({ ...formData, department: value === 'none' ? '' : value })}>
                    <SelectTrigger data-testid="select-department">
                      <SelectValue placeholder="Select Department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Department</SelectItem>
                      <SelectItem value="Engineering">Engineering</SelectItem>
                      <SelectItem value="Design">Design</SelectItem>
                      <SelectItem value="Product">Product</SelectItem>
                      <SelectItem value="Marketing">Marketing</SelectItem>
                      <SelectItem value="Sales">Sales</SelectItem>
                      <SelectItem value="Operations">Operations</SelectItem>
                      <SelectItem value="HR">HR</SelectItem>
                      <SelectItem value="Finance">Finance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 flex items-center space-x-2 p-3 border border-border rounded-sm bg-muted/30">
                  <Checkbox
                    id="is-line-manager"
                    checked={formData.is_line_manager}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_line_manager: checked })}
                    data-testid="checkbox-line-manager"
                  />
                  <label
                    htmlFor="is-line-manager"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    This person is a Line Manager (will be able to allocate resources)
                  </label>
                </div>
                <div>
                  <Label>Line Manager</Label>
                  <Select value={formData.line_manager_id || 'none'} onValueChange={(value) => setFormData({ ...formData, line_manager_id: value === 'none' ? '' : value })}>
                    <SelectTrigger data-testid="select-line-manager">
                      <SelectValue placeholder="No Manager" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Manager</SelectItem>
                      {resources.filter(r => (r.role === 'manager' || r.role === 'admin') && (!editingResource || r.id !== editingResource.id)).map(r => (
                        <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label>{t('resources.availability')} (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.availability}
                    onChange={(e) => setFormData({ ...formData, availability: parseInt(e.target.value) })}
                    required
                    data-testid="input-availability"
                  />
                </div>
                <div className="col-span-2">
                  <Label>{t('resources.hardSkills')} (comma separated)</Label>
                  <Input
                    value={formData.hard_skills}
                    onChange={(e) => setFormData({ ...formData, hard_skills: e.target.value })}
                    placeholder="Python, Java, React"
                    data-testid="input-hard-skills"
                  />
                </div>
                <div className="col-span-2">
                  <Label>{t('resources.softSkills')} (comma separated)</Label>
                  <Input
                    value={formData.soft_skills}
                    onChange={(e) => setFormData({ ...formData, soft_skills: e.target.value })}
                    placeholder="Leadership, Communication"
                    data-testid="input-soft-skills"
                  />
                </div>
                <div className="col-span-2">
                  <Label>{t('resources.languageSkills')} (comma separated)</Label>
                  <Input
                    value={formData.language_skills}
                    onChange={(e) => setFormData({ ...formData, language_skills: e.target.value })}
                    placeholder="English, Spanish"
                    data-testid="input-language-skills"
                  />
                </div>
                <div className="col-span-2">
                  <Label>{t('resources.technicalSkills')} (comma separated)</Label>
                  <Input
                    value={formData.technical_skills}
                    onChange={(e) => setFormData({ ...formData, technical_skills: e.target.value })}
                    placeholder="AWS, Docker, Kubernetes"
                    data-testid="input-technical-skills"
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }} data-testid="cancel-button">
                  {t('resources.cancel')}
                </Button>
                <Button type="submit" style={{ backgroundColor: '#002FA7' }} data-testid="save-button">
                  {t('resources.save')}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters Section */}
      <div className="mb-6 p-4 border border-border rounded-sm bg-muted/30" data-testid="resources-filters">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <Label className="text-xs mb-2">Search</Label>
            <Input
              placeholder="Name, email, position..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9"
              data-testid="search-resources"
            />
          </div>
          <div>
            <Label className="text-xs mb-2">Location</Label>
            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger className="h-9" data-testid="filter-location">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {uniqueLocations.map(loc => (
                  <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs mb-2">Function</Label>
            <Select value={positionFilter} onValueChange={setPositionFilter}>
              <SelectTrigger className="h-9" data-testid="filter-position">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Functions</SelectItem>
                {uniquePositions.map(pos => (
                  <SelectItem key={pos} value={pos}>{pos}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs mb-2">Skills</Label>
            <Input
              placeholder="Filter by skill..."
              value={skillFilter}
              onChange={(e) => setSkillFilter(e.target.value)}
              className="h-9"
              data-testid="filter-skills"
            />
          </div>
          <div>
            <Label className="text-xs mb-2">Line Manager</Label>
            <Select value={managerFilter} onValueChange={setManagerFilter}>
              <SelectTrigger className="h-9" data-testid="filter-manager">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Managers</SelectItem>
                {uniqueManagers.map(mgr => (
                  <SelectItem key={mgr.id} value={mgr.id}>{mgr.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex justify-end mt-3">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={clearFilters}
            className="rounded-sm"
            data-testid="clear-filters"
          >
            Clear Filters
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="resources-list">
        {filteredResources.map((resource) => (
          <Card key={resource.id} className="border border-border rounded-sm shadow-sm" data-testid={`resource-card-${resource.id}`}>
            <CardHeader className="p-4 pb-2">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold" style={{ fontFamily: 'Manrope, sans-serif' }}>
                    {resource.name}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">{resource.position}</p>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(resource)}
                    className="h-8 w-8 p-0"
                    data-testid={`edit-resource-${resource.id}`}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(resource.id)}
                    className="h-8 w-8 p-0 text-destructive"
                    data-testid={`delete-resource-${resource.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0 text-sm">
              <div className="space-y-2">
                <p><span className="text-muted-foreground">{t('resources.email')}:</span> {resource.email}</p>
                <p><span className="text-muted-foreground">{t('resources.location')}:</span> {resource.location}</p>
                <p><span className="text-muted-foreground">{t('resources.availability')}:</span> {resource.availability}%</p>
                {resource.technical_skills.length > 0 && (
                  <div>
                    <p className="text-muted-foreground mb-1">{t('resources.technicalSkills')}:</p>
                    <div className="flex flex-wrap gap-1">
                      {resource.technical_skills.map((skill, idx) => (
                        <span key={idx} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Resources;
