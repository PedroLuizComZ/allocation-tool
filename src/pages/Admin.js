import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Shield, Users, Settings } from 'lucide-react';
import { toast } from 'sonner';

const Admin = () => {
  const { t } = useTranslation();
  const [resources, setResources] = useState([]);
  const [overallocations, setOverallocations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [resourcesRes, overallocRes] = await Promise.all([
        api.get('/resources'),
        api.get('/dashboard/overallocations')
      ]);
      setResources(resourcesRes.data);
      setOverallocations(overallocRes.data.overallocated_resources || []);
    } catch (error) {
      console.error('Error:', error);
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const updateResourceRole = async (resourceId, newRole) => {
    try {
      const resource = resources.find(r => r.id === resourceId);
      if (!resource) return;

      await api.put(`/resources/${resourceId}`, {
        ...resource,
        role: newRole
      });
      
      toast.success(t('common.success'));
      fetchData();
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error(t('common.error'));
    }
  };

  const updateManager = async (resourceId, managerId) => {
    try {
      const resource = resources.find(r => r.id === resourceId);
      if (!resource) return;

      await api.put(`/resources/${resourceId}`, {
        ...resource,
        line_manager_id: managerId || null
      });
      
      toast.success(t('common.success'));
      fetchData();
    } catch (error) {
      console.error('Error updating manager:', error);
      toast.error(t('common.error'));
    }
  };

  if (loading) return <div className="text-sm">{t('common.loading')}</div>;

  const managers = resources.filter(r => r.role === 'manager' || r.role === 'admin');

  return (
    <div data-testid="admin-page">
      <div className="mb-6">
        <h1 className="text-4xl font-bold tracking-tight mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
          {t('admin.title')}
        </h1>
        <p className="text-sm text-muted-foreground">Manage system configuration and user permissions</p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Overallocation Alert */}
        {overallocations.length > 0 && (
          <Card className="border-destructive border-2 rounded-sm shadow-sm" data-testid="overallocation-alert">
            <CardHeader className="p-6 pb-2">
              <CardTitle className="text-xl font-semibold text-destructive flex items-center gap-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
                <Shield className="w-5 h-5" />
                {t('overallocation.warning')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-4">
              <p className="text-sm text-muted-foreground mb-4">
                {overallocations.length} {overallocations.length === 1 ? 'resource is' : 'resources are'} overallocated
              </p>
              <div className="space-y-2">
                {overallocations.map((item) => (
                  <div key={item.resource.id} className="flex items-center justify-between p-3 bg-destructive/10 rounded-sm">
                    <div>
                      <p className="font-medium">{item.resource.name}</p>
                      <p className="text-xs text-muted-foreground">{item.resource.position}</p>
                    </div>
                    <span className="px-2 py-1 bg-destructive text-white rounded text-xs font-medium">
                      {item.utilization}% (+{item.overallocation}%)
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* User Management */}
        <Card className="border border-border rounded-sm shadow-sm">
          <CardHeader className="p-6 pb-2">
            <CardTitle className="text-xl font-semibold flex items-center gap-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
              <Users className="w-5 h-5" />
              {t('admin.userManagement')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-4">
            <div className="space-y-4" data-testid="user-management-list">
              {resources.map((resource) => (
                <div key={resource.id} className="flex items-center justify-between p-4 border border-border rounded-sm">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium">{resource.name}</p>
                      <span className={`px-2 py-0.5 text-xs rounded ${
                        resource.role === 'admin' ? 'bg-primary text-white' :
                        resource.role === 'manager' ? 'bg-secondary text-secondary-foreground' : 
                        'border border-border'
                      }`}>
                        {t(`roles.${resource.role}`)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{resource.email}</p>
                    <p className="text-xs text-muted-foreground">{resource.position}</p>
                  </div>
                  
                  <div className="flex gap-2">
                    <div className="w-40">
                      <Select
                        value={resource.role}
                        onValueChange={(value) => updateResourceRole(resource.id, value)}
                      >
                        <SelectTrigger data-testid={`role-select-${resource.id}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">{t('roles.admin')}</SelectItem>
                          <SelectItem value="manager">{t('roles.manager')}</SelectItem>
                          <SelectItem value="user">{t('roles.user')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="w-48">
                      <Select
                        value={resource.line_manager_id || 'none'}
                        onValueChange={(value) => updateManager(resource.id, value === 'none' ? null : value)}
                      >
                        <SelectTrigger data-testid={`manager-select-${resource.id}`}>
                          <SelectValue placeholder="No Manager" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">{t('hierarchy.noManager')}</SelectItem>
                          {managers.filter(m => m.id !== resource.id).map((manager) => (
                            <SelectItem key={manager.id} value={manager.id}>
                              {manager.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* System Configuration */}
        <Card className="border border-border rounded-sm shadow-sm">
          <CardHeader className="p-6 pb-2">
            <CardTitle className="text-xl font-semibold flex items-center gap-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
              <Settings className="w-5 h-5" />
              {t('admin.configuration')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-4">
            <p className="text-sm text-muted-foreground">
              System configuration options will appear here. Future enhancements may include:
            </p>
            <ul className="list-disc list-inside text-sm text-muted-foreground mt-2 space-y-1">
              <li>Overallocation threshold settings</li>
              <li>Notification preferences</li>
              <li>Default allocation percentages</li>
              <li>Project templates</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Admin;
