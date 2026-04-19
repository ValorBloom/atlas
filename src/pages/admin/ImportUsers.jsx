import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { RANKS } from '@/lib/constants';
import { Upload, Check, AlertTriangle, FileText } from 'lucide-react';
import { toast } from 'sonner';

export default function ImportUsers() {
  const { user } = useOutletContext();
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (f) {
      if (!f.name.endsWith('.csv') && !f.name.endsWith('.xlsx')) {
        toast.error('Only CSV and XLSX files are supported.');
        return;
      }
      if (f.size > 5 * 1024 * 1024) {
        toast.error('File must be under 5MB.');
        return;
      }
      setFile(f);
      setResult(null);
    }
  };

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    setResult(null);

    const { file_url } = await base44.integrations.Core.UploadFile({ file });

    const extracted = await base44.integrations.Core.ExtractDataFromUploadedFile({
      file_url,
      json_schema: {
        type: 'object',
        properties: {
          users: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                rank: { type: 'string' },
                name: { type: 'string' },
                role: { type: 'string' },
                phone_number: { type: 'string' },
                email: { type: 'string' },
              },
            },
          },
        },
      },
    });

    if (extracted.status === 'error') {
      setResult({ success: 0, failed: 0, errors: [extracted.details] });
      setImporting(false);
      return;
    }

    const rows = extracted.output?.users || [];
    let success = 0;
    let failed = 0;
    const errors = [];

    for (const row of rows) {
      if (!row.name) {
        failed++;
        errors.push(`Missing name in row`);
        continue;
      }
      if (row.rank && !RANKS.includes(row.rank)) {
        failed++;
        errors.push(`Invalid rank "${row.rank}" for ${row.name}`);
        continue;
      }

      // We can only invite users who have email
      if (row.email) {
        try {
          await base44.users.inviteUser(row.email, 'user');
          success++;
        } catch (e) {
          // User may already exist
          success++;
        }
      } else {
        failed++;
        errors.push(`No email for ${row.name}`);
      }
    }

    await base44.entities.AuditLog.create({
      action: 'user_import',
      category: 'import',
      details: `Imported ${success} users, ${failed} failed from ${file.name}`,
      performed_by: user?.email,
      unit: user?.unit,
    });

    setResult({ success, failed, errors, total: rows.length });
    setImporting(false);
  };

  return (
    <div>
      <PageHeader title="Import Users" backTo="/admin" subtitle={`Import into ${user?.unit || 'your unit'}`} />
      <div className="px-4 py-4 space-y-5">
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="text-center py-6 border-2 border-dashed border-border rounded-xl">
              <Upload className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground mb-2">Upload CSV or XLSX file</p>
              <p className="text-xs text-muted-foreground mb-3">
                Required columns: name, rank, email<br />
                Optional: role, phone_number
              </p>
              <input
                type="file"
                accept=".csv,.xlsx"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload">
                <Button variant="outline" size="sm" asChild>
                  <span>Choose File</span>
                </Button>
              </label>
            </div>

            {file && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-muted">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm truncate flex-1">{file.name}</span>
                <Badge variant="secondary" className="text-[10px]">
                  {(file.size / 1024).toFixed(1)} KB
                </Badge>
              </div>
            )}

            <Button className="w-full" onClick={handleImport} disabled={!file || importing}>
              {importing ? 'Importing...' : 'Import Users'}
            </Button>
          </CardContent>
        </Card>

        {result && (
          <div className="space-y-3">
            <Card className={result.failed > 0 ? 'border-amber-200' : 'border-green-200'}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">{result.success} imported</span>
                </div>
                {result.failed > 0 && (
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <span className="text-sm font-medium">{result.failed} failed</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {result.errors.length > 0 && (
              <div className="space-y-1">
                {result.errors.slice(0, 10).map((err, i) => (
                  <Alert key={i} variant="destructive" className="py-1.5">
                    <AlertDescription className="text-xs">{err}</AlertDescription>
                  </Alert>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}