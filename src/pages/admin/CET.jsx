import React, { useState, useRef, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import PageHeader from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { isInstructor, INSTRUCTOR_RANKS } from '@/lib/constants';
import {
  Plus, Trash2, Copy, Send, Check, Sparkles, Quote, Save,
  ChevronLeft, ChevronRight, FileText, X, Edit3
} from 'lucide-react';
import { toast } from 'sonner';
import { format, addDays, subDays, parseISO } from 'date-fns';
import SuccessDialog from '@/components/ui/SuccessDialog';
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter,
  AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel,
} from '@/components/ui/alert-dialog';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const TODAY_STR = format(new Date(), 'yyyy-MM-dd');

function getSlots(centerDate) {
  const center = centerDate ? new Date(centerDate + 'T00:00:00') : new Date();
  return [-1, 0, 1].map(offset => {
    const d = addDays(center, offset);
    return {
      date: format(d, 'yyyy-MM-dd'),
      label: format(d, 'd'),
      month: format(d, 'MMM'),
      day: DAY_NAMES[d.getDay()],
      isToday: format(d, 'yyyy-MM-dd') === TODAY_STR,
    };
  });
}

const DEFAULT_ROWS = [
  { time: '0800H', activity: 'Pre-MDST Book-in (Last Cadet to book in by 0820H)' },
  { time: '0820H', activity: 'Administration Camp Companion Book-in by Cadet Big 3' },
  { time: '0830H', activity: 'First Parade + Temperature Taking + Water Parade' },
];

// Validate time is HHmmH format (0000H-2359H)
function isValidTime(t) {
  if (!t) return true; // allow empty
  const match = t.match(/^(\d{2})(\d{2})H$/);
  if (!match) return false;
  const h = parseInt(match[1]);
  const m = parseInt(match[2]);
  return h >= 0 && h <= 23 && m >= 0 && m <= 59;
}

function formatTimeInput(raw) {
  // Auto-append H if user typed 4 digits
  const digits = raw.replace(/[^0-9]/g, '').slice(0, 4);
  if (digits.length === 4) return digits + 'H';
  return raw;
}

export default function CET() {
  const { user } = useOutletContext();
  const qc = useQueryClient();

  const [selectedDate, setSelectedDate] = useState(TODAY_STR);
  const slots = getSlots(selectedDate);
  const [wdi, setWdi] = useState('');
  const [quote, setQuote] = useState('');
  const [quoteAuthor, setQuoteAuthor] = useState('');
  const [rows, setRows] = useState(DEFAULT_ROWS.map((r, i) => ({ ...r, id: i })));
  const [notes, setNotes] = useState('');
  const [sending, setSending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [existingId, setExistingId] = useState(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [usedQuotes, setUsedQuotes] = useState([]);
  const [customWdi, setCustomWdi] = useState('');
  const [successMsg, setSuccessMsg] = useState(null);

  // Fetch instructors in same unit
  const { data: unitUsers = [] } = useQuery({
    queryKey: ['unit-users-instructors', user?.unit],
    queryFn: () => base44.entities.User.filter({ unit: user?.unit }),
    enabled: !!user?.unit,
  });
  const instructors = unitUsers.filter(u => u.user_role === 'instructor');

  // Fetch CET records for this unit
  const { data: cetRecords = [] } = useQuery({
    queryKey: ['cet-records', user?.unit],
    queryFn: async () => {
      const { data } = await base44.functions.invoke('getCET', {});
      return data?.records || [];
    },
    enabled: !!user?.unit,
  });

  // Fetch templates
  const { data: templates = [] } = useQuery({
    queryKey: ['cet-templates', user?.unit],
    queryFn: () => base44.entities.CETTemplate.filter({ unit: user?.unit }),
    enabled: !!user?.unit,
  });

  // Load existing CET when date changes
  useEffect(() => {
    const rec = cetRecords.find(r => r.date === selectedDate);
    if (rec) {
      setWdi(rec.wdi || '');
      setQuote(rec.quote || '');
      setQuoteAuthor(rec.quote_author || '');
      setRows((rec.timetable || DEFAULT_ROWS).map((r, i) => ({ ...r, id: i })));
      setNotes(rec.notes || '');
      setExistingId(rec.id);
      setIsEditing(false);
    } else {
      const lastName = (user?.display_name || user?.full_name || '').split(' ').slice(-1)[0];
      setWdi(user?.rank && lastName ? `${user.rank} ${lastName}` : '');
      setQuote('');
      setQuoteAuthor('');
      setRows(DEFAULT_ROWS.map((r, i) => ({ ...r, id: i })));
      setNotes('');
      setExistingId(null);
      setIsEditing(true);
    }
  }, [selectedDate, cetRecords.length]);

  const addRow = () => setRows(prev => [...prev, { id: Date.now(), time: '', activity: '' }]);
  const updateRow = (id, field, value) => {
    if (field === 'time') value = formatTimeInput(value);
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };
  const removeRow = (id) => setRows(prev => prev.filter(r => r.id !== id));

  const fetchDailyQuote = async () => {
    setLoadingQuote(true);
    const avoidList = usedQuotes.length > 0 ? `Do NOT use any of these quotes: ${usedQuotes.join(' | ')}. ` : '';

    // Derive theme from timetable activities
    const activitiesText = rows.map(r => r.activity).filter(Boolean).join(', ').toLowerCase();
    let themeHint = '';
    if (/\bpt\b|ippt|run|physical|fitness|bfa|soc/.test(activitiesText)) {
      themeHint = 'The day has physical training — prefer quotes about endurance, physical resilience, or discipline.';
    } else if (/field|camp|exercise|ops|tactical|navigation/.test(activitiesText)) {
      themeHint = 'The day involves field exercise or operations — prefer quotes about resilience, courage, or leadership under pressure.';
    } else if (/lecture|lesson|theory|class|briefing|study/.test(activitiesText)) {
      themeHint = 'The day has lessons or briefings — prefer quotes about learning, knowledge, or intellectual growth.';
    } else if (/range|shoot|marksmanship|live|firing/.test(activitiesText)) {
      themeHint = 'The day involves shooting or range activities — prefer quotes about focus, precision, or composure.';
    } else if (/admin|rest|welfare|medical/.test(activitiesText)) {
      themeHint = 'The day is an admin or rest day — prefer quotes about reflection, teamwork, or preparation.';
    }

    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `Give one short motivational quote for military cadets. ${themeHint} ${avoidList}Author must be a real named person (no "Unknown"/"Anonymous"). Return JSON only.`,
      response_json_schema: {
        type: 'object',
        properties: {
          quote: { type: 'string' },
          author: { type: 'string' },
        },
      },
    });
    setLoadingQuote(false);
    if (res?.quote) {
      setQuote(res.quote);
      setQuoteAuthor(res.author || '');
      setUsedQuotes(prev => [...prev.slice(-9), res.quote]);
    }
  };

  const applyTemplate = (tmpl) => {
    setRows((tmpl.timetable || []).map((r, i) => ({ ...r, id: i })));
    setNotes(tmpl.notes || '');
    setShowTemplates(false);
    setIsEditing(true);
    toast.success(`Template "${tmpl.name}" applied — edit as needed`);
  };

  const saveTemplate = async () => {
    if (!newTemplateName.trim()) return;
    setSavingTemplate(true);
    await base44.entities.CETTemplate.create({
      name: newTemplateName.trim(),
      unit: user?.unit,
      timetable: rows.map(r => ({ time: r.time, activity: r.activity })),
      notes,
      created_by: user?.email,
    });
    setSavingTemplate(false);
    setNewTemplateName('');
    qc.invalidateQueries({ queryKey: ['cet-templates'] });
    toast.success('Template saved');
  };

  const deleteTemplate = async (id) => {
    await base44.entities.CETTemplate.delete(id);
    qc.invalidateQueries({ queryKey: ['cet-templates'] });
    toast.success('Template deleted');
  };

  const hasInvalidTime = rows.some(r => r.time && !isValidTime(r.time));

  const generateCET = () => {
    const d = parseISO(selectedDate);
    const dateStr = format(d, 'dd MMM yyyy');
    const dayStr = DAY_NAMES[d.getDay()];
    let text = `${user?.unit?.toUpperCase() || 'UNIT'} CET for ${dateStr} (${dayStr})\n\n`;
    if (wdi) text += `WDI: ${wdi}\n\n`;
    if (quote) {
      text += `"${quote}"`;
      if (quoteAuthor) text += `\n— ${quoteAuthor}`;
      text += '\n\n';
    }
    rows.forEach(r => {
      if (r.time || r.activity) text += `${r.time}: ${r.activity}\n`;
    });
    if (notes) text += `\n${'='.repeat(20)}\nAdditional Instructions:\n${notes}\n`;
    return text.trim();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generateCET());
    toast.success('CET copied to clipboard');
  };

  const handleSend = async () => {
    if (hasInvalidTime) { toast.error('Fix invalid times before sending'); return; }
    setSending(true);
    const d = parseISO(selectedDate);
    const dateStr = format(d, 'dd MMM yyyy');
    const dayStr = DAY_NAMES[d.getDay()];
    const cet = generateCET();
    const isUpdate = !!existingId;

    try {
      const { data } = await base44.functions.invoke('sendCET', {
        existingId: existingId || null,
        record: {
          date: selectedDate,
          wdi,
          quote,
          quote_author: quoteAuthor,
          timetable: rows.map(r => ({ time: r.time, activity: r.activity })),
          notes,
        },
        announcement: {
          title: isUpdate ? `CET Updated — ${dateStr} (${dayStr})` : `CET — ${dateStr} (${dayStr})`,
          content: cet,
        },
        notification: {
          title: isUpdate ? `📋 CET Updated — ${dateStr}` : `📋 CET Posted — ${dateStr}`,
          message: isUpdate ? `The CET for ${dateStr} has been updated.\n\n${cet}` : `The CET for ${dateStr} has been posted.\n\n${cet}`,
          type: 'info',
          category: 'announcement',
        },
      });

      if (data?.error || !data?.success) {
        toast.error('Failed to save CET. Please try again.');
        return;
      }

      setConfirming(false);
      setIsEditing(false);
      setExistingId(data.id || existingId);
      qc.invalidateQueries({ queryKey: ['cet-records'] });
      qc.invalidateQueries({ queryKey: ['announcements'] });
      setSuccessMsg(isUpdate
        ? `The CET for ${dateStr} has been updated and your unit has been notified.`
        : `The CET for ${dateStr} has been sent to your unit.`);
    } catch (err) {
      toast.error('Failed to save CET. Please try again.');
    } finally {
      setSending(false);
    }
  };

  if (!isInstructor(user)) {
    return (
      <div>
        <PageHeader title="CET" backTo="/admin" />
        <div className="px-4 py-16 text-center">
          <p className="text-sm text-muted-foreground">Instructors only.</p>
        </div>
      </div>
    );
  }

  const selectedRec = cetRecords.find(r => r.date === selectedDate);
  const canEdit = !selectedRec || isEditing;

  return (
    <div className="pb-24">
      <PageHeader title="Send CET" backTo="/admin" subtitle="Daily Training Programme" />

      {/* ── Date Scroll — centered on selected ── */}
      <div className="px-4 pt-3 pb-1">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedDate(format(addDays(new Date(selectedDate + 'T00:00:00'), -1), 'yyyy-MM-dd'))}
            className="w-8 h-8 rounded-lg border border-border bg-card flex items-center justify-center shrink-0 hover:bg-muted/40 transition-colors"
          >
            <ChevronLeft className="h-4 w-4 text-muted-foreground" />
          </button>
          <div className="flex gap-2 flex-1 justify-center">
            {slots.map(d => {
              const rec = cetRecords.find(r => r.date === d.date);
              const isSelected = d.date === selectedDate;
              return (
                <button
                  key={d.date}
                  onClick={() => setSelectedDate(d.date)}
                  className={`flex flex-col items-center px-4 py-2.5 rounded-xl border shrink-0 transition-all min-w-[72px] ${
                    isSelected
                      ? 'bg-primary border-primary/40 text-primary-foreground'
                      : 'bg-card border-border text-foreground hover:bg-muted/40'
                  }`}
                >
                  <span className={`text-[10px] font-medium uppercase tracking-wide ${isSelected ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>{d.day}</span>
                  <span className="text-sm font-bold mt-0.5">{d.label}</span>
                  <span className={`text-[9px] mt-0.5 ${isSelected ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>{d.isToday ? 'Today' : d.month}</span>
                  {rec?.is_published && <div className={`w-1.5 h-1.5 rounded-full mt-1 ${isSelected ? 'bg-primary-foreground/60' : 'bg-green-400'}`} />}
                </button>
              );
            })}
          </div>
          <button
            onClick={() => setSelectedDate(format(addDays(new Date(selectedDate + 'T00:00:00'), 1), 'yyyy-MM-dd'))}
            className="w-8 h-8 rounded-lg border border-border bg-card flex items-center justify-center shrink-0 hover:bg-muted/40 transition-colors"
          >
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* ── Status Banner ── */}
      {selectedRec?.is_published && !isEditing ? (
        <div className="mx-4 mt-3 p-3 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-green-400" />
            <span className="text-sm text-green-400 font-medium">CET Published</span>
          </div>
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-green-400" onClick={() => setIsEditing(true)}>
            <Edit3 className="h-3 w-3" /> Edit
          </Button>
        </div>
      ) : !selectedRec ? (
        <div className="mx-4 mt-3 p-3 bg-amber-500/8 border border-amber-500/20 rounded-xl">
          <p className="text-xs text-amber-400 font-medium">No CET uploaded for this date yet</p>
        </div>
      ) : null}

      <div className="px-4 py-4 space-y-5">

        {/* Unit + WDI */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Unit</Label>
            <div className="h-9 px-3 bg-muted/40 border border-border rounded-md flex items-center text-sm font-semibold text-muted-foreground">
              {user?.unit || '—'}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">WDI</Label>
            {canEdit ? (
              <>
                <Select
                  value={instructors.some(u => `${u.rank || ''} ${u.display_name || u.full_name || ''}`.trim() === wdi) ? wdi : 'custom'}
                  onValueChange={val => {
                    if (val === 'custom') {
                      setWdi(customWdi);
                    } else {
                      setWdi(val);
                      setCustomWdi('');
                    }
                  }}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select WDI" />
                  </SelectTrigger>
                  <SelectContent>
                    {instructors.map(u => {
                      const label = `${u.rank || ''} ${u.display_name || u.full_name || ''}`.trim();
                      return (
                        <SelectItem key={u.id} value={label}>
                          {label}
                        </SelectItem>
                      );
                    })}
                    <SelectItem value="custom">Enter manually...</SelectItem>
                  </SelectContent>
                </Select>
                {(!instructors.some(u => `${u.rank || ''} ${u.display_name || u.full_name || ''}`.trim() === wdi)) && (
                  <Input
                    placeholder="e.g. ME4 Jun Kang"
                    value={customWdi}
                    onChange={e => { setCustomWdi(e.target.value); setWdi(e.target.value); }}
                    className="h-9 mt-1"
                  />
                )}
              </>
            ) : (
              <div className="h-9 px-3 bg-muted/40 border border-border rounded-md flex items-center text-sm">{wdi || '—'}</div>
            )}
          </div>
        </div>

        {/* Daily Quote */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <Quote className="h-3 w-3" /> Quote of the Day
            </Label>
            {canEdit && (
              <Button variant="ghost" size="sm" className="text-xs h-7 gap-1 text-primary" onClick={fetchDailyQuote} disabled={loadingQuote}>
                <Sparkles className="h-3 w-3" />
                {loadingQuote ? 'Generating...' : 'Generate Unique'}
              </Button>
            )}
          </div>
          {canEdit ? (
            <>
              <Input placeholder="Quote text..." value={quote} onChange={e => setQuote(e.target.value)} className="text-sm" />
              <Input placeholder="Author" value={quoteAuthor} onChange={e => setQuoteAuthor(e.target.value)} className="text-sm" />
            </>
          ) : (
            quote ? (
              <div className="p-3 bg-muted/30 rounded-lg border border-border">
                <p className="text-sm italic">"{quote}"</p>
                {quoteAuthor && <p className="text-xs text-muted-foreground mt-1">— {quoteAuthor}</p>}
              </div>
            ) : <p className="text-xs text-muted-foreground">No quote set</p>
          )}
        </div>

        {/* Timetable */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Timetable</Label>
            {canEdit && (
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" className="text-xs h-7 gap-1" onClick={() => setShowTemplates(!showTemplates)}>
                  <FileText className="h-3 w-3" /> Templates
                </Button>
              </div>
            )}
          </div>

          {/* Template panel */}
          {showTemplates && (
            <Card className="border-border bg-muted/20">
              <CardContent className="p-3 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Saved Templates</p>
                {templates.length === 0 && <p className="text-xs text-muted-foreground">No templates yet.</p>}
                {templates.map(tmpl => (
                  <div key={tmpl.id} className="flex items-center gap-2">
                    <button onClick={() => applyTemplate(tmpl)} className="flex-1 text-left text-sm text-foreground hover:text-primary transition-colors">
                      {tmpl.name}
                    </button>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => deleteTemplate(tmpl.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                <div className="border-t border-border pt-2 flex gap-2">
                  <Input placeholder="Template name..." value={newTemplateName} onChange={e => setNewTemplateName(e.target.value)} className="h-7 text-xs flex-1" />
                  <Button size="sm" className="h-7 text-xs" onClick={saveTemplate} disabled={savingTemplate || !newTemplateName.trim()}>
                    {savingTemplate ? '...' : 'Save Current'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {canEdit ? (
            <>
              {rows.map((row) => (
                <div key={row.id} className="flex items-center gap-2">
                  <div className="relative w-20 shrink-0">
                    <Input
                      placeholder="0800H"
                      value={row.time}
                      onChange={e => updateRow(row.id, 'time', e.target.value)}
                      className={`w-20 text-xs font-mono text-center ${row.time && !isValidTime(row.time) ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                    />
                  </div>
                  <Input
                    placeholder="Activity / event"
                    value={row.activity}
                    onChange={e => updateRow(row.id, 'activity', e.target.value)}
                    className="flex-1 text-sm"
                  />
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0" onClick={() => removeRow(row.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
              {hasInvalidTime && <p className="text-xs text-destructive">⚠ Time must be in HHmmH format (e.g. 0800H, 1430H)</p>}
              <Button variant="outline" size="sm" className="w-full h-9 text-xs" onClick={addRow}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Row
              </Button>
            </>
          ) : (
            <div className="space-y-1">
              {rows.map((r, i) => (
                <div key={i} className="flex gap-3 py-1 border-b border-border/40 last:border-0">
                  <span className="text-xs font-mono text-muted-foreground w-14 shrink-0">{r.time}</span>
                  <span className="text-sm text-foreground">{r.activity}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Additional Instructions */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground uppercase tracking-wide">
            Additional Instructions <span className="normal-case font-normal">(optional)</span>
          </Label>
          {canEdit ? (
            <textarea
              className="w-full min-h-[80px] px-3 py-2 rounded-md border border-input bg-transparent text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
              placeholder="1. The bunk must be in SBA condition at all times..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          ) : (
            notes ? <p className="text-sm text-foreground whitespace-pre-wrap">{notes}</p> : <p className="text-xs text-muted-foreground">None</p>
          )}
        </div>

        {/* Preview */}
        {canEdit && (
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Preview</Label>
            <Card className="bg-muted/20 border-border">
              <CardContent className="p-4">
                <pre className="text-xs whitespace-pre-wrap font-mono leading-relaxed">{generateCET()}</pre>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Actions */}
        {canEdit && (
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 h-10" onClick={handleCopy}>
              <Copy className="h-4 w-4 mr-1" /> Copy
            </Button>
            <Button className="flex-1 h-10" onClick={() => setConfirming(true)} disabled={hasInvalidTime}>
              <Send className="h-4 w-4 mr-1" /> {existingId ? 'Update CET' : 'Send CET'}
            </Button>
          </div>
        )}

      </div>

      {/* Confirmation popup */}
      <AlertDialog open={confirming} onOpenChange={(v) => { if (!v && !sending) setConfirming(false); }}>
        <AlertDialogContent className="max-w-[340px] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{existingId ? 'Update CET?' : 'Send CET?'}</AlertDialogTitle>
            <AlertDialogDescription>
              {existingId
                ? 'This will update the CET and notify your entire unit.'
                : 'This will publish the CET and notify your entire unit.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={sending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleSend(); }}
              disabled={sending}
            >
              {sending ? 'Sending...' : (existingId ? 'Confirm & Update' : 'Confirm & Send')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <SuccessDialog
        open={!!successMsg}
        onClose={() => setSuccessMsg(null)}
        title="CET Sent"
        message={successMsg}
      />
    </div>
  );
}