import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import PageHeader from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Megaphone, Plus, Send, X } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function Announcements() {
  const { user } = useOutletContext();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', target_role: 'all' });
  const [saving, setSaving] = useState(false);

  const { data: announcements = [], isLoading } = useQuery({
    queryKey: ['announcements', user?.unit],
    queryFn: () => base44.entities.Announcement.filter({ unit: user?.unit }, '-created_date', 30),
    enabled: !!user?.unit,
  });

  const handleCreate = async () => {
    if (!form.title || !form.content) return;
    setSaving(true);
    await base44.entities.Announcement.create({
      ...form,
      unit: user?.unit,
      is_active: true,
      sent_by: user?.email,
    });

    await base44.entities.Notification.create({
      title: `📢 ${form.title}`,
      message: form.content.substring(0, 200),
      type: 'info',
      category: 'announcement',
      recipient_unit: user?.unit,
    });

    setSaving(false);
    setShowForm(false);
    setForm({ title: '', content: '', target_role: 'all' });
    toast.success('Announcement sent');
    queryClient.invalidateQueries({ queryKey: ['announcements'] });
  };

  return (
    <div>
      <PageHeader 
        title="Announcements" 
        backTo="/admin" 
        rightAction={
          <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
            {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          </Button>
        }
      />
      <div className="px-4 py-4 space-y-4">
        {showForm && (
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Title</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Announcement title" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Content</Label>
                <Textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="Write announcement..." className="min-h-[100px]" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Target</Label>
                <Select value={form.target_role} onValueChange={(v) => setForm({ ...form, target_role: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="cadet">Cadets Only</SelectItem>
                    <SelectItem value="instructor">Instructors Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full" onClick={handleCreate} disabled={!form.title || !form.content || saving}>
                <Send className="h-4 w-4 mr-1" />{saving ? 'Sending...' : 'Send Announcement'}
              </Button>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-muted border-t-primary rounded-full animate-spin" />
          </div>
        ) : announcements.length === 0 ? (
          <div className="text-center py-12">
            <Megaphone className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No announcements yet.</p>
          </div>
        ) : (
          announcements.map(a => (
            <Card key={a.id}>
              <CardContent className="p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold">{a.title}</p>
                  <Badge variant="secondary" className="text-[10px] shrink-0">{a.target_role}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-3">{a.content}</p>
                <p className="text-[10px] text-muted-foreground/60 mt-2">
                  {format(new Date(a.created_date), 'dd MMM yyyy, HH:mm')}
                </p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}