import { useState, useEffect, useCallback } from 'react';
import { Shield, Save, Loader2 } from 'lucide-react';
import type { Designation, FeaturePermission, DesignationAccess } from '@/types/user';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';

interface PermissionRow {
  feature_key: string;
  feature_name: string;
  feature_description: string | null;
  category: string;
  is_premium: boolean;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

export function AccessManagementPage() {
  const { profile } = useAuth();
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [features, setFeatures] = useState<FeaturePermission[]>([]);
  const [selectedDesignation, setSelectedDesignation] = useState('');
  const [permissions, setPermissions] = useState<PermissionRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const fetchDesignations = useCallback(async () => {
    const { data, error } = await supabase
      .from('designations')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('Error fetching designations:', error);
      return;
    }
    setDesignations(data || []);
  }, []);

  const fetchFeatures = useCallback(async () => {
    const { data, error } = await supabase
      .from('feature_permissions')
      .select('*')
      .order('category')
      .order('feature_name');

    if (error) {
      console.error('Error fetching features:', error);
      return;
    }
    setFeatures(data || []);
  }, []);

  const fetchDesignationAccess = useCallback(
    async (designationId: string) => {
      const { data, error } = await supabase
        .from('designation_feature_access')
        .select('*')
        .eq('designation_id', designationId);

      if (error) {
        console.error('Error fetching access:', error);
        return;
      }

      const accessMap: Record<string, DesignationAccess> = {};
      (data || []).forEach((a: DesignationAccess & { designation_id: string }) => {
        accessMap[a.feature_key] = a;
      });

      // Build permission rows from features + existing access
      const rows: PermissionRow[] = features.map((f) => {
        const access = accessMap[f.feature_key];
        return {
          feature_key: f.feature_key,
          feature_name: f.feature_name,
          feature_description: f.feature_description,
          category: f.category,
          is_premium: f.is_premium,
          can_view: access?.can_view ?? false,
          can_create: access?.can_create ?? false,
          can_edit: access?.can_edit ?? false,
          can_delete: access?.can_delete ?? false,
        };
      });

      setPermissions(rows);
    },
    [features],
  );

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await fetchDesignations();
      await fetchFeatures();
      setIsLoading(false);
    };
    init();
  }, [fetchDesignations, fetchFeatures]);

  useEffect(() => {
    if (selectedDesignation && features.length > 0) {
      fetchDesignationAccess(selectedDesignation);
    } else {
      setPermissions([]);
    }
  }, [selectedDesignation, features, fetchDesignationAccess]);

  const handleToggle = (featureKey: string, field: keyof Pick<PermissionRow, 'can_view' | 'can_create' | 'can_edit' | 'can_delete'>) => {
    setPermissions((prev) =>
      prev.map((p) =>
        p.feature_key === featureKey ? { ...p, [field]: !p[field] } : p,
      ),
    );
    setSaveMessage(null);
  };

  const handleSave = async () => {
    if (!selectedDesignation) return;

    setIsSaving(true);
    setSaveMessage(null);

    try {
      // Delete existing entries for this designation
      const { error: deleteError } = await supabase
        .from('designation_feature_access')
        .delete()
        .eq('designation_id', selectedDesignation);

      if (deleteError) throw deleteError;

      // Insert new rows (only those with at least one permission enabled)
      const rowsToInsert = permissions
        .filter((p) => p.can_view || p.can_create || p.can_edit || p.can_delete)
        .map((p) => ({
          designation_id: selectedDesignation,
          org_id: profile?.org_id,
          feature_key: p.feature_key,
          can_view: p.can_view,
          can_create: p.can_create,
          can_edit: p.can_edit,
          can_delete: p.can_delete,
        }));

      if (rowsToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('designation_feature_access')
          .insert(rowsToInsert);

        if (insertError) throw insertError;
      }

      setSaveMessage('Permissions saved successfully.');
    } catch (err) {
      console.error('Error saving permissions:', err);
      setSaveMessage('Failed to save permissions.');
    } finally {
      setIsSaving(false);
    }
  };

  // Group permissions by category
  const groupedPermissions: Record<string, PermissionRow[]> = {};
  permissions.forEach((p) => {
    if (!groupedPermissions[p.category]) {
      groupedPermissions[p.category] = [];
    }
    groupedPermissions[p.category].push(p);
  });

  if (isLoading) {
    return <div className="text-center py-12 text-muted-foreground">Loading access management...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Shield className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Access Management</h1>
        </div>
      </div>

      {/* Designation Selector */}
      <div className="mb-6 max-w-sm">
        <label className="text-sm font-medium">Select Designation</label>
        <select
          value={selectedDesignation}
          onChange={(e) => setSelectedDesignation(e.target.value)}
          className="mt-1 w-full px-3 py-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Choose a designation...</option>
          {designations.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </div>

      {!selectedDesignation ? (
        <div className="text-center py-12 text-muted-foreground rounded-lg border bg-card">
          Select a designation to manage its feature access permissions.
        </div>
      ) : permissions.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground rounded-lg border bg-card">
          No features configured. Add feature permissions to get started.
        </div>
      ) : (
        <>
          {/* Save Message */}
          {saveMessage && (
            <div
              className={`mb-4 p-3 rounded-md text-sm ${
                saveMessage.includes('success')
                  ? 'bg-green-50 border border-green-200 text-green-800'
                  : 'bg-red-50 border border-red-200 text-red-800'
              }`}
            >
              {saveMessage}
            </div>
          )}

          {/* Permission Matrix */}
          {Object.entries(groupedPermissions).map(([category, rows]) => (
            <div key={category} className="mb-6">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                {category}
              </h3>
              <div className="rounded-lg border bg-card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left px-4 py-3 font-medium">Feature</th>
                        <th className="text-center px-4 py-3 font-medium w-20">View</th>
                        <th className="text-center px-4 py-3 font-medium w-20">Create</th>
                        <th className="text-center px-4 py-3 font-medium w-20">Edit</th>
                        <th className="text-center px-4 py-3 font-medium w-20">Delete</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => (
                        <tr key={row.feature_key} className="border-b last:border-b-0 hover:bg-muted/30">
                          <td className="px-4 py-3">
                            <div>
                              <span className="font-medium">{row.feature_name}</span>
                              {row.is_premium && (
                                <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
                                  Premium
                                </span>
                              )}
                            </div>
                            {row.feature_description && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {row.feature_description}
                              </p>
                            )}
                          </td>
                          <td className="text-center px-4 py-3">
                            <input
                              type="checkbox"
                              checked={row.can_view}
                              onChange={() => handleToggle(row.feature_key, 'can_view')}
                              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-ring"
                            />
                          </td>
                          <td className="text-center px-4 py-3">
                            <input
                              type="checkbox"
                              checked={row.can_create}
                              onChange={() => handleToggle(row.feature_key, 'can_create')}
                              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-ring"
                            />
                          </td>
                          <td className="text-center px-4 py-3">
                            <input
                              type="checkbox"
                              checked={row.can_edit}
                              onChange={() => handleToggle(row.feature_key, 'can_edit')}
                              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-ring"
                            />
                          </td>
                          <td className="text-center px-4 py-3">
                            <input
                              type="checkbox"
                              checked={row.can_delete}
                              onChange={() => handleToggle(row.feature_key, 'can_delete')}
                              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-ring"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ))}

          {/* Save Button */}
          <div className="flex justify-end mt-4">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {isSaving ? 'Saving...' : 'Save Permissions'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
