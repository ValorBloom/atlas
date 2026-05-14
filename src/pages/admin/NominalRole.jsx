import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import PageHeader from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MobileSelect, MobileSelectItem } from '@/components/ui/MobileSelect';
import { RANKS, UNITS, getGroupLabel, getGroupOptions } from '@/lib/constants';
import { Users, Pencil, Check, X, Upload, FileText, AlertTriangle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

function EditRow({ u, onSave, onCancel, unit }) {
  const [form, setForm] = useState({
    display_name: u.display_name || u.full_name || '',
    rank: u.rank || '',
    platoon: u.platoon || '',
  });
  const [saving, setSaving] = useState(false);
  const groupLabel = getGroupLabel(unit);
  const groupOptions = getGroupOptions(unit);

  const handleSave = async () => {
    setSaving(true);
    const res = await base44.functions.invoke('adminUpdateUser', { userId: u.id, updates: form });
    setSaving(false);
    if (res?.data?.error) { toast.error(res.data.error); return; }
    toast.success('Updated');
    onSave();
  };

  return (
    <div className="p-3 rounded-xl border border-primary/30 bg-primary/5 space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <p className="text-[10px] text-muted-foreground uppercase">Name</p>
          <Input value={form.display_name} onChange={e => setForm({ ...form, display_name: e.target.value })} className="h-8 text-xs" />
        </div>
        <div className="space-y-1">
          <p className="text-[10px] text-muted-foreground uppercase">Rank</p>
          <MobileSelect value={form.rank} onValueChange={v => setForm({ ...form, rank: v })} placeholder="Rank" className="h-8 text-xs">
            {RANKS.map(r => <MobileSelectItem key={r} value={r}>{r}</MobileSelectItem>)}
          </MobileSelect>
        </div>
      </div>
      <div className="space-y-1">
        <p className="text-[10px] text-muted-foreground uppercase">{groupLabel}</p>
        <MobileSelect value={form.platoon} onValueChange={v => setForm({ ...form, platoon: v })} placeholder={`Select ${groupLabel}`} className="h-8 text-xs">
          {(groupOptions || []).map(g => <MobileSelectItem key={g} value={g}>{g}</MobileSelectItem>)}
        </MobileSelect>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="flex-1 h-7 text-xs" onClick={onCancel} disabled={saving}>
          <X className="h-3 w-3 mr-1" />Cancel
        </Button>
        <Button size="sm" className="flex-1 h-7 text-xs" onClick={handleSave} disabled={saving}>
          <Check className="h-3 w-3 mr-1" />{saving ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </div>
  );
}

function UserRow({ u, unit, canDelete }) {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const qc = useQueryClient();

  const handleDelete = async () => {
    setDeleting(true);
    await base44.entities.User.delete(u.id);
    qc.invalidateQueries({ queryKey: ['nominal-users', unit] });
    toast.success('Cadet removed');
  };

  if (editing) return <EditRow u={u} unit={unit} onSave={() => { setEditing(false); qc.invalidateQueries({ queryKey: ['nominal-users', unit] }); }} onCancel={() => setEditing(false)} />;

  if (confirmDelete) return (
    <div className="flex items-center justify-between p-3 rounded-xl border border-destructive/40 bg-destructive/5">
      <p className="text-xs text-destructive font-medium">Remove {u.display_name || u.full_name}?</p>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setConfirmDelete(false)} disabled={deleting}>Cancel</Button>
        <Button variant="destructive" size="sm" className="h-7 text-xs" onClick={handleDelete} disabled={deleting}>
          {deleting ? 'Removing…' : 'Confirm'}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-card">
      <div>
        <p className="text-sm font-semibold">{u.rank ? `${u.rank} ` : ''}{u.display_name || u.full_name || <span className="text-muted-foreground italic">No name</span>}</p>
        <p className="text-xs text-muted-foreground">{u.platoon || '—'} · {u.email}</p>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setEditing(true)}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        {canDelete && (
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => setConfirmDelete(true)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

export default function NominalRole() {
  const { user } = useOutletContext();
  const unit = user?.unit;
  const qc = useQueryClient();

  const { data: allUsers = [], isLoading } = useQuery({
    queryKey: ['nominal-users', unit],
    queryFn: () => base44.entities.User.filter({ unit }),
    enabled: !!unit,
  });

  const cadets = allUsers.filter(u => u.user_role !== 'instructor').sort((a, b) => (a.platoon || '').localeCompare(b.platoon || '') || (a.full_name || '').localeCompare(b.full_name || ''));
  const instructors = allUsers.filter(u => u.user_role === 'instructor').sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));

  const groupLabel = getGroupLabel(unit);
  const groupOptions = getGroupOptions(unit) || [];

  // Group cadets by platoon
  const grouped = groupOptions.reduce((acc, g) => {
    acc[g] = cadets.filter(u => u.platoon === g);
    return acc;
  }, {});
  const ungrouped = cadets.filter(u => !u.platoon || !groupOptions.includes(u.platoon));

  // Import section state
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [showImport, setShowImport] = useState(false);

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const extracted = await base44.integrations.Core.ExtractDataFromUploadedFile({
      file_url,
      json_schema: {
        type: 'object',
        properties: {
          users: {
            type: 'array',
            items: { type: 'object', properties: { rank: { type: 'string' }, name: { type: 'string' }, email: { type: 'string' } } }
          }
        }
      }
    });
    if (extracted.status === 'error') { setImportResult({ errors: [extracted.details] }); setImporting(false); return; }
    const rows = extracted.output?.users || [];
    let success = 0, failed = 0;
    const errors = [];
    for (const row of rows) {
      if (!row.email) { failed++; errors.push(`No email for ${row.name}`); continue; }
      try { await base44.users.inviteUser(row.email, 'user'); success++; } catch { success++; }
    }
    setImportResult({ success, failed, errors, total: rows.length });
    setImporting(false);
    qc.invalidateQueries({ queryKey: ['nominal-users', unit] });
    toast.success(`${success} users imported`);
  };

  return (
    <div>
      <PageHeader title="Nominal Role" backTo="/" subtitle={`${unit} Wing — All personnel`} />
      <div className="px-4 py-4 space-y-5 pb-24">

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2">
          <Card><CardContent className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Cadets</p>
            <p className="text-2xl font-bold">{cadets.length}</p>
          </CardContent></Card>
          <Card><CardContent className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Instructors</p>
            <p className="text-2xl font-bold">{instructors.length}</p>
          </CardContent></Card>
        </div>

        {/* Import toggle */}
        <Button variant="outline" className="w-full h-9 text-xs" onClick={() => setShowImport(v => !v)}>
          <Upload className="h-3.5 w-3.5 mr-1.5" />{showImport ? 'Hide Import' : 'Import Users from CSV'}
        </Button>

        {showImport && (
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="border-2 border-dashed border-border rounded-xl p-4 text-center">
                <Upload className="h-6 w-6 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground mb-2">CSV / XLSX — columns: name, rank, email</p>
                <input type="file" accept=".csv,.xlsx" id="nr-file-upload" className="hidden"
                  onChange={e => { const f = e.target.files[0]; if (f) { setFile(f); setImportResult(null); } }} />
                <label htmlFor="nr-file-upload">
                  <Button variant="outline" size="sm" asChild><span>Choose File</span></Button>
                </label>
              </div>
              {file && <div className="flex items-center gap-2 p-2 rounded-lg bg-muted text-xs"><FileText className="h-3.5 w-3.5 shrink-0" /><span className="truncate flex-1">{file.name}</span></div>}
              <Button className="w-full h-9 text-xs" onClick={handleImport} disabled={!file || importing}>
                {importing ? 'Importing…' : 'Import'}
              </Button>
              {importResult && (
                <Alert className={importResult.errors?.length ? 'border-amber-500/25' : 'border-green-500/25'}>
                  <AlertDescription className="text-xs">
                    {importResult.success} imported{importResult.failed > 0 ? `, ${importResult.failed} failed` : ''}
                    {importResult.errors?.slice(0, 3).map((e, i) => <div key={i} className="text-destructive mt-1">{e}</div>)}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-muted border-t-primary rounded-full animate-spin" /></div>
        ) : (
          <>
            {/* Cadets by group */}
            {groupOptions.map(g => (
              (grouped[g]?.length > 0) && (
                <div key={g} className="space-y-2">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">{groupLabel} — {g} ({grouped[g].length})</p>
                  {grouped[g].map(u => <UserRow key={u.id} u={u} unit={unit} canDelete />)}
                </div>
              )
            ))}
            {ungrouped.length > 0 && (
              <div className="space-y-2">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">Cadets — Unassigned ({ungrouped.length})</p>
                {ungrouped.map(u => <UserRow key={u.id} u={u} unit={unit} canDelete />)}
              </div>
            )}
            {/* Instructors */}
            {instructors.length > 0 && (
              <div className="space-y-2">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">Instructors ({instructors.length})</p>
                {instructors.map(u => <UserRow key={u.id} u={u} unit={unit} />)}
              </div>
            )}
            {allUsers.length === 0 && (
              <div className="py-10 text-center">
                <Users className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No personnel found</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}