import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit2, Trash2, X, Briefcase, ArrowUpRight } from 'lucide-react';
import type { Designation, ReportingRelation, AppRole } from '@/types/user';
import { APP_ROLES, getRoleBadgeColor } from '@/types/user';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';

export function DesignationsPage() {
  const { profile } = useAuth();
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [reportingRelations, setReportingRelations] = useState<ReportingRelation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDesignation, setEditingDesignation] = useState<Designation | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDesignations = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from('designations')
        .select('*')
        .order('name');

      if (fetchError) throw fetchError;

      // Fetch employee counts from profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('designation_id')
        .eq('is_active', true);

      if (profilesError) throw profilesError;

      // Count employees per designation
      const countMap: Record<string, number> = {};
      (profiles || []).forEach((p) => {
        if (p.designation_id) {
          countMap[p.designation_id] = (countMap[p.designation_id] || 0) + 1;
        }
      });

      const designationsWithCount = (data || []).map((d) => ({
        ...d,
        employee_count: countMap[d.id] || 0,
      }));

      setDesignations(designationsWithCount);
    } catch (err) {
      console.error('Error fetching designations:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchReportingRelations = useCallback(async () => {
    const { data, error: fetchError } = await supabase
      .from('reporting_hierarchy')
      .select('*');

    if (fetchError) {
      console.error('Error fetching reporting relations:', fetchError);
      return;
    }
    setReportingRelations(data || []);
  }, []);

  useEffect(() => {
    fetchDesignations();
    fetchReportingRelations();
  }, [fetchDesignations, fetchReportingRelations]);

  const handleCreate = () => {
    setEditingDesignation(null);
    setError(null);
    setDialogOpen(true);
  };

  const handleEdit = (designation: Designation) => {
    setEditingDesignation(designation);
    setError(null);
    setDialogOpen(true);
  };

  const handleDelete = async (designation: Designation) => {
    if (!confirm(`Are you sure you want to delete the designation "${designation.name}"?`)) {
      return;
    }

    try {
      // Delete reporting relations first
      await supabase
        .from('reporting_hierarchy')
        .delete()
        .eq('designation_id', designation.id);

      await supabase
        .from('reporting_hierarchy')
        .delete()
        .eq('reports_to_designation_id', designation.id);

      const { error: deleteError } = await supabase
        .from('designations')
        .delete()
        .eq('id', designation.id);

      if (deleteError) throw deleteError;

      await fetchDesignations();
      await fetchReportingRelations();
    } catch (err) {
      console.error('Error deleting designation:', err);
      alert('Failed to delete designation. It may be in use.');
    }
  };

  const handleSubmit = async (formData: DesignationFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const orgId = profile?.org_id;

      if (editingDesignation) {
        // Update designation
        const { error: updateError } = await supabase
          .from('designations')
          .update({
            name: formData.name,
            role: formData.role,
            description: formData.description || null,
          })
          .eq('id', editingDesignation.id);

        if (updateError) throw updateError;

        // Update reporting relation
        await supabase
          .from('reporting_hierarchy')
          .delete()
          .eq('designation_id', editingDesignation.id);

        if (formData.reports_to) {
          const { error: relError } = await supabase
            .from('reporting_hierarchy')
            .insert({
              org_id: orgId,
              designation_id: editingDesignation.id,
              reports_to_designation_id: formData.reports_to,
            });

          if (relError) throw relError;
        }
      } else {
        // Create designation
        const { data: newDesignation, error: createError } = await supabase
          .from('designations')
          .insert({
            org_id: orgId,
            name: formData.name,
            role: formData.role,
            description: formData.description || null,
            is_active: true,
          })
          .select()
          .single();

        if (createError) throw createError;

        // Create reporting relation if specified
        if (formData.reports_to && newDesignation) {
          const { error: relError } = await supabase
            .from('reporting_hierarchy')
            .insert({
              org_id: orgId,
              designation_id: newDesignation.id,
              reports_to_designation_id: formData.reports_to,
            });

          if (relError) throw relError;
        }
      }

      setDialogOpen(false);
      setEditingDesignation(null);
      await fetchDesignations();
      await fetchReportingRelations();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getReportsToName = (designationId: string): string | null => {
    const relation = reportingRelations.find((r) => r.designation_id === designationId);
    if (!relation?.reports_to_designation_id) return null;
    const parent = designations.find((d) => d.id === relation.reports_to_designation_id);
    return parent?.name || null;
  };

  if (isLoading) {
    return <div className="text-center py-12 text-muted-foreground">Loading designations...</div>;
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Briefcase className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Designations</h1>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Add Designation
        </button>
      </div>

      {/* Designation Cards */}
      {designations.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground rounded-lg border bg-card">
          No designations found. Create one to get started.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {designations.map((d) => {
            const reportsTo = getReportsToName(d.id);
            return (
              <div key={d.id} className="rounded-lg border bg-card p-5">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-base">{d.name}</h3>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleEdit(d)}
                      className="p-1.5 rounded-md hover:bg-muted"
                      title="Edit"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(d)}
                      className="p-1.5 rounded-md hover:bg-muted text-red-600"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  {/* Role Badge */}
                  <div>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getRoleBadgeColor(d.role)}`}
                    >
                      {APP_ROLES.find((r) => r.value === d.role)?.label || d.role}
                    </span>
                  </div>

                  {/* Reports To */}
                  {reportsTo && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <ArrowUpRight className="h-3.5 w-3.5" />
                      <span>Reports to: {reportsTo}</span>
                    </div>
                  )}

                  {/* Description */}
                  {d.description && (
                    <p className="text-sm text-muted-foreground">{d.description}</p>
                  )}

                  {/* Employee Count */}
                  <div className="pt-2 border-t">
                    <span className="text-sm text-muted-foreground">
                      {d.employee_count || 0} employee{d.employee_count !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Active Status */}
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      d.is_active
                        ? 'bg-green-100 text-green-800 border border-green-200'
                        : 'bg-gray-100 text-gray-800 border border-gray-200'
                    }`}
                  >
                    {d.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Designation Dialog */}
      <DesignationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        designation={editingDesignation}
        designations={designations}
        reportingRelations={reportingRelations}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        error={error}
      />
    </motion.div>
  );
}

// ---- Designation Dialog ----

interface DesignationFormData {
  name: string;
  role: AppRole;
  reports_to: string;
  description: string;
}

interface DesignationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  designation: Designation | null;
  designations: Designation[];
  reportingRelations: ReportingRelation[];
  onSubmit: (data: DesignationFormData) => void;
  isSubmitting: boolean;
  error: string | null;
}

function DesignationDialog({
  open,
  onOpenChange,
  designation,
  designations,
  reportingRelations,
  onSubmit,
  isSubmitting,
  error,
}: DesignationDialogProps) {
  const isEditing = !!designation;

  const [formData, setFormData] = useState<DesignationFormData>({
    name: '',
    role: 'sales_agent',
    reports_to: '',
    description: '',
  });

  useEffect(() => {
    if (designation) {
      const relation = reportingRelations.find((r) => r.designation_id === designation.id);
      setFormData({
        name: designation.name,
        role: designation.role,
        reports_to: relation?.reports_to_designation_id || '',
        description: designation.description || '',
      });
    } else {
      setFormData({
        name: '',
        role: 'sales_agent',
        reports_to: '',
        description: '',
      });
    }
  }, [designation, reportingRelations, open]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  // Filter out the current designation from the reports_to options
  const reportsToOptions = designations.filter((d) => d.id !== designation?.id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={() => onOpenChange(false)} />
      <div className="relative bg-background rounded-lg shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto mx-4">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold">
            {isEditing ? 'Edit Designation' : 'Create Designation'}
          </h2>
          <button onClick={() => onOpenChange(false)} className="p-1 rounded-md hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-md bg-red-50 border border-red-200 text-red-800 text-sm">
              {error}
            </div>
          )}

          {/* Name */}
          <div>
            <label className="text-sm font-medium">Designation Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
              className="mt-1 w-full px-3 py-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="e.g. Senior Sales Manager"
            />
          </div>

          {/* Role */}
          <div>
            <label className="text-sm font-medium">Role *</label>
            <select
              required
              value={formData.role}
              onChange={(e) => setFormData((p) => ({ ...p, role: e.target.value as AppRole }))}
              className="mt-1 w-full px-3 py-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {APP_ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          {/* Reports To */}
          <div>
            <label className="text-sm font-medium">Reports To</label>
            <select
              value={formData.reports_to}
              onChange={(e) => setFormData((p) => ({ ...p, reports_to: e.target.value }))}
              className="mt-1 w-full px-3 py-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">None (Top Level)</option>
              {reportsToOptions.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-medium">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
              rows={3}
              className="mt-1 w-full px-3 py-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              placeholder="Describe this designation..."
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-4 py-2 text-sm font-medium rounded-md border border-input hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : isEditing ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
