import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import PageHeader from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { isInstructor, formatRankName } from '@/lib/constants';
import { Plus, Trash2, Copy, Send, Check, Sparkles, Quote } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const DEFAULT_ROWS = [
  { time: '0800H', activity: 'Pre-MDST Book-in (Last Cadet to book in by 0820H)' },
  { time: '0820H', activity: 'Administration Camp Companion Book-in by Cadet Big 3' },
  { time: '0830H', activity: 'First Parade + Temperature Taking + Water Parade' },
];

export default function CET() {
  const { user } = useOutletContext();
  const qc = useQueryClient();

  const today = new Date();
  const dateStr = format(today, 'dd MMM yyyy');
  const dayStr = DAY_NAMES[today.getDay()];

  const [wdi, setWdi] = useState('');
  const [quote, setQuote] = useState('');
  const [quoteAuthor, setQuoteAuthor] = useState('');
  const [rows, setRows] = useState(DEFAULT_ROWS.map((r, i) => ({ ...r, id: i })));
  const [notes, setNotes] = useState('');
  const [sending, setSending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [loadingQuote, setLoadingQuote] = useState(false);

  const addRow = () => {
    setRows(prev => [...prev, { id: Date.now(), time: '', activity: '' }]);
  };

  const updateRow = (id, field, value) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const removeRow = (id) => {
    setRows(prev => prev.filter(r => r.id !== id));
  };

  const fetchDailyQuote = async () => {
    setLoadingQuote(true);
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: 'Give me one short, powerful motivational quote suitable for military cadets. Return ONLY the quote text and the author name, nothing else. Format: {"quote": "...", "author": "..."}',
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
    }
  };

  const generateCET = () => {
    const header = `${user?.unit?.toUpperCase() || 'UNIT'} CET for ${dateStr} (${dayStr})`;
    let text = `${header}\n\n`;
    if (wdi) text += `WDI: ${wdi}\n\n`;
    if (quote) {
      text += `Quote of the day: "${quote}"\n`;
      if (quoteAuthor) text += `— ${quoteAuthor}\n`;
      text += '\n';
    }
    rows.forEach(r => {
      if (r.time || r.activity) {
        text += `${r.time}: ${r.activity}\n`;
      }
    });
    if (notes) {
      text += `\n${'='.repeat(20)}\nAdditional Instructions:\n${notes}\n`;
    }
    return text.trim();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generateCET());
    toast.success('CET copied to clipboard');
  };

  const handleSend = async () => {
    setSending(true);
    const cet = generateCET();
    await base44.entities.Announcement.create({
      title: `CET — ${dateStr} (${dayStr})`,
      content: cet,
      unit: user?.unit,
      target_role: 'all',
      is_active: true,
      sent_by: user?.email,
    });
    await base44.entities.Notification.create({
      title: `📋 CET Posted — ${dateStr}`,
      message: `The CET for ${dateStr} has been posted.`,
      type: 'info',
      category: 'announcement',
      recipient_unit: user?.unit,
    });
    setSending(false);
    setConfirming(false);
    toast.success('CET sent to unit');
    qc.invalidateQueries({ queryKey: ['announcements'] });
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

  return (
    <div>
      <PageHeader title="Send CET" backTo="/admin" subtitle={`${dateStr} (${dayStr})`} />
      <div className="px-4 py-4 space-y-5">

        {/* Header info */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Unit</Label>
            <div className="h-10 px-3 bg-card border border-border rounded-md flex items-center text-sm font-semibold">
              {user?.unit || '—'}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">WDI (rank + name)</Label>
            <Input
              placeholder="e.g. ME4 Jun Kang"
              value={wdi}
              onChange={e => setWdi(e.target.value)}
              className="h-10"
            />
          </div>
        </div>

        {/* Daily Quote */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <Quote className="h-3.5 w-3.5" /> Quote of the Day
            </Label>
            <Button
              variant="ghost" size="sm"
              className="text-xs h-7 gap-1.5 text-primary"
              onClick={fetchDailyQuote}
              disabled={loadingQuote}
            >
              <Sparkles className="h-3 w-3" />
              {loadingQuote ? 'Fetching...' : 'Generate'}
            </Button>
          </div>
          <Input
            placeholder="Quote text..."
            value={quote}
            onChange={e => setQuote(e.target.value)}
            className="text-sm"
          />
          <Input
            placeholder="Author"
            value={quoteAuthor}
            onChange={e => setQuoteAuthor(e.target.value)}
            className="text-sm"
          />
        </div>

        {/* Timetable rows */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground uppercase tracking-wide">Timetable</Label>
          {rows.map((row, idx) => (
            <div key={row.id} className="flex items-center gap-2">
              <Input
                placeholder="HHmmH"
                value={row.time}
                onChange={e => updateRow(row.id, 'time', e.target.value)}
                className="w-20 text-xs font-mono text-center shrink-0"
              />
              <Input
                placeholder="Activity / event"
                value={row.activity}
                onChange={e => updateRow(row.id, 'activity', e.target.value)}
                className="flex-1 text-sm"
              />
              <Button
                variant="ghost" size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                onClick={() => removeRow(row.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" className="w-full h-9 text-xs" onClick={addRow}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Row
          </Button>
        </div>

        {/* Additional notes */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground uppercase tracking-wide">Additional Instructions <span className="normal-case font-normal">(optional)</span></Label>
          <textarea
            className="w-full min-h-[80px] px-3 py-2 rounded-md border border-input bg-transparent text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
            placeholder="1. The bunk must be in SBA condition at all times..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </div>

        {/* Preview */}
        <div className="space-y-3">
          <Label className="text-xs text-muted-foreground uppercase tracking-wide">Preview</Label>
          <Card className="bg-muted/30">
            <CardContent className="p-4">
              <pre className="text-xs whitespace-pre-wrap font-mono leading-relaxed">{generateCET()}</pre>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1 h-10" onClick={handleCopy}>
            <Copy className="h-4 w-4 mr-1" /> Copy
          </Button>
          {!confirming ? (
            <Button className="flex-1 h-10" onClick={() => setConfirming(true)}>
              <Send className="h-4 w-4 mr-1" /> Send CET
            </Button>
          ) : (
            <Button className="flex-1 h-10 bg-destructive hover:bg-destructive/90" onClick={handleSend} disabled={sending}>
              <Check className="h-4 w-4 mr-1" />{sending ? 'Sending...' : 'Confirm Send'}
            </Button>
          )}
        </div>

      </div>
    </div>
  );
}