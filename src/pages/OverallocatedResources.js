import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { AlertTriangle, ArrowLeft } from 'lucide-react';

const OverallocatedResources = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [overallocations, setOverallocations] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [overallocRes, allocRes, projRes] = await Promise.all([
        api.get('/dashboard/overallocations'),
        api.get('/allocations'),
        api.get('/projects')
      ]);
      setOverallocations(overallocRes.data.overallocated_resources || []);
      setAllocations(allocRes.data);
      setProjects(projRes.data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getProjectName = (id) => projects.find(p => p.id === id)?.name || id;

  if (loading) return <div className="text-sm">{t('common.loading')}</div>;

  return (
    <div data-testid="overallocated-page">
      <div className="mb-6">
        <Button variant="outline" onClick={() => navigate('/')} className="mb-4 rounded-sm">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>
        <h1 className="text-4xl font-bold tracking-tight text-destructive flex items-center gap-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
          <AlertTriangle className="w-8 h-8" />
          Overallocated Resources
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          {overallocations.length} resource{overallocations.length !== 1 ? 's are' : ' is'} currently overallocated
        </p>
      </div>

      {overallocations.length === 0 ? (
        <Card className="border border-border rounded-sm shadow-sm">
          <CardContent className="p-6 text-center text-muted-foreground">
            <p className="text-lg mb-2">✅ No overallocations detected</p>
            <p className="text-sm">All resources are within their capacity limits.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {overallocations.map((item) => {
            const resourceAllocations = allocations.filter(a => a.resource_id === item.resource.id);
            
            return (
              <Card key={item.resource.id} className="border-2 border-destructive rounded-sm shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <AlertTriangle className="w-5 h-5 text-destructive" />
                        <div>
                          <h3 className="text-xl font-semibold" style={{ fontFamily: 'Manrope, sans-serif' }}>
                            {item.resource.name}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {item.resource.position} • {item.resource.location}
                            {item.resource.country && ` • ${item.resource.country}`}
                            {item.resource.zone && ` (${item.resource.zone})`}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-destructive" style={{ fontFamily: 'Manrope, sans-serif' }}>
                        {item.utilization}%
                      </div>
                      <p className="text-sm text-muted-foreground">
                        +{item.overallocation}% over capacity
                      </p>
                    </div>
                  </div>

                  {/* Overallocation Period Highlight */}
                  {item.overallocation_periods && item.overallocation_periods.length > 0 && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-sm">
                      <p className="text-sm font-medium text-destructive mb-2">📅 Overallocation Period(s):</p>
                      <div className="space-y-1">
                        {item.overallocation_periods.map((period, idx) => (
                          <div key={idx} className="flex items-center justify-between text-sm">
                            <span className="text-destructive font-medium">
                              {period.start} → {period.end}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              Peak: {period.peak_utilization}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Earliest Availability */}
                  {item.earliest_availability && (
                    <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-green-700">✓ Earliest Availability:</span>
                        <span className="text-sm font-bold text-green-700">{item.earliest_availability}</span>
                      </div>
                    </div>
                  )}

                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Capacity Utilization</span>
                      <span className="text-sm text-destructive">{item.utilization}% / 100%</span>
                    </div>
                    <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-destructive transition-all"
                        style={{ width: `${Math.min(item.utilization, 100)}%` }}
                      />
                      {item.utilization > 100 && (
                        <div 
                          className="h-full bg-destructive opacity-50 -mt-4"
                          style={{ width: `${Math.min(item.utilization - 100, 100)}%` }}
                        />
                      )}
                    </div>
                  </div>

                  <div className="border-t border-border pt-4">
                    <p className="text-sm font-medium mb-3">Current Allocations ({resourceAllocations.length}):</p>
                    <div className="space-y-2">
                      {resourceAllocations.map((alloc) => (
                        <div key={alloc.id} className="flex items-center justify-between p-3 bg-muted rounded-sm">
                          <div className="flex-1">
                            <p className="text-sm font-medium">{getProjectName(alloc.project_id)}</p>
                            <p className="text-xs text-muted-foreground">{alloc.role} • {alloc.start_date} → {alloc.end_date}</p>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-medium">{alloc.allocation_percentage}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 p-3 bg-destructive/10 rounded-sm">
                    <p className="text-sm text-destructive">
                      <strong>⚠️ Action Required:</strong> This resource is overcommitted. Consider redistributing workload or adjusting project timelines.
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default OverallocatedResources;
