import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Megaphone, Send, Sparkles, X, Plus, CheckSquare, Square, Users, Shield, UserCheck } from 'lucide-react';
import { MobileSelect, MobileSelectItem } from '@/components/ui/MobileSelect';
import { UNITS } from '@/lib/constants';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function MOAnnouncement() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', target_role: 'all' });
  const [selectedUnits, setSelectedUnits] = useState([]);
  const [saving, setSaving] = useState(false);
  const [aiNotes, setAiNotes] = useState('');
  const [showAi, setShowAi] = useState(false);
  const [generatingDraft, setGeneratingDraft] = useState(false);

  const { data: announcements = [] } = useQuery({
    queryKey: ['mo-announcements'],
    queryFn: () => base44.entities.Announcement.filter({ sent_by: 'medical_officer' }, '-created_date', 30),
  });

  const toggleUnit = (u) => setSelectedUnits(prev => prev.includes(u) ? prev.filter(x => x !== u) : [...prev, u]);
  const allSelected = selectedUnits.length === UNITS.length;
  const toggleAll = () => setSelectedUnits(allSelected ? [] : [...UNITS]);

  const handleAiDraft = async () => {
    if (!aiNotes.trim()) return;
    setGeneratingDraft(true);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Military health advisory. Convert notes to formal announcement JSON with "title" (short) and "content" (≤120 words, formal tone). Notes: ${aiNotes}`,
        response_json_schema: { type: 'object', properties: { title: { type: 'string' }, content: { type: 'string' } } },
      });
      if (res?.title || res?.content) {
        setForm(prev => ({ ...prev, title: res.title || prev.title, content: res.content || prev.content }));
        setShowAi(false);
        setAiNotes('');
        setShowForm(true);
        toast.success('Draft ready — review before sending');
      }
    } catch (err) {
      toast.error('AI draft failed. Please try again.');
    } finally {
      setGeneratingDraft(false);
    }
  };

  const handleSend = async () => {
    if (!form.title || !form.content || selectedUnits.length === 0 || saving) {
      toast.error('Fill in all fields and select at least one unit');
      return;
    }
    setSaving(true);
    try {
      await Promise.all(selectedUnits.map(unit =>
        base44.entities.Announcement.create({
          ...form,
          unit,
          is_active: true,
          sent_by: 'medical_officer',
          keywords: ['medical', 'health'],
        }).then(() =>
          base44.entities.Notification.create({
            title: `🏥 ${form.title}`,
            message: form.content.substring(0, 200),
            type: 'warning',
            category: 'announcement',
            recipient_unit: unit,
          })
        )
      ));
      setShowForm(false);
      setForm({ title: '', content: '', target_role: 'all' });
      setSelectedUnits([]);
      qc.invalidateQueries({ queryKey: ['mo-announcements'] });
      toast.success(`Sent to ${selectedUnits.length} unit(s)`);
    } catch (err) {
      toast.error('Failed to send. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">Health Announcements</p>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" className="text-primary gap-1" onClick={() => { setShowAi(!showAi); setShowForm(false); }}>
            <Sparkles className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => { setShowForm(!showForm); setShowAi(false); }}>
            {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* AI Draft Panel */}
      {showAi && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold text-primary">Draft with AI</p>
            </div>
            <Textarea
              value={aiNotes}
              onChange={e => setAiNotes(e.target.value)}
              placeholder="e.g. There's a flu outbreak in Alpha wing, remind everyone to wash hands and avoid sharing items"
              className="min-h-[80px] text-sm"
            />
            <Button className="w-full gap-2" onClick={handleAiDraft} disabled={!aiNotes.trim() || generatingDraft}>
              <Sparkles className="h-4 w-4" />
              {generatingDraft ? 'Drafting...' : 'Generate Draft'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Form */}
      {showForm && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Title</Label>
              <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. HEALTH ADVISORY — RESPIRATORY ILLNESS" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Content</Label>
              <Textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} placeholder="Write advisory..." className="min-h-[100px]" />
            </div>
            {/* Audience */}
            <div className="space-y-1.5">
              <Label className="text-xs">Audience</Label>
              <div className="flex gap-2">
                {[
                  { value: 'all', label: 'Everyone', icon: Users },
                  { value: 'instructor', label: 'Instructors', icon: Shield },
                  { value: 'cadet', label: 'Cadets', icon: UserCheck },
                ].map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    onClick={() => setForm(f => ({ ...f, target_role: value }))}
                    className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-lg border text-xs font-medium transition-all ${
                      form.target_role === value
                        ? 'bg-primary/15 border-primary/30 text-primary'
                        : 'bg-muted/30 border-border text-muted-foreground'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Target Units</Label>
                <button onClick={toggleAll} className="text-xs text-primary flex items-center gap-1">
                  {allSelected ? <CheckSquare className="h-3 w-3" /> : <Square className="h-3 w-3" />}
                  {allSelected ? 'Deselect All' : 'Select All'}
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {UNITS.map(u => (
                  <button
                    key={u}
                    onClick={() => toggleUnit(u)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                      selectedUnits.includes(u)
                        ? 'bg-primary/15 border-primary/30 text-primary'
                        : 'bg-muted/40 border-border text-muted-foreground'
                    }`}
                  >
                    {u}
                  </button>
                ))}
              </div>
            </div>
            <Button className="w-full" onClick={handleSend} disabled={!form.title || !form.content || selectedUnits.length === 0 || saving}>
              <Send className="h-4 w-4 mr-1" />
              {saving ? 'Sending...' : `Send to ${selectedUnits.length || 0} unit(s)`}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* History */}
      {announcements.length === 0 ? (
        <Card><CardContent className="p-6 text-center">
          <Megaphone className="h-7 w-7 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No health announcements sent yet.</p>
        </CardContent></Card>
      ) : announcements.map(a => (
        <Card key={a.id}>
          <CardContent className="p-3.5">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-semibold">{a.title}</p>
              <Badge variant="secondary" className="text-[10px] shrink-0">{a.unit}</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{a.content}</p>
            <p className="text-[10px] text-muted-foreground/60 mt-2">{format(new Date(a.created_date), 'dd MMM yyyy, HH:mm')}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}