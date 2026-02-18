const API_URL = import.meta.env.VITE_API_URL || 'https://zta-backend-y10h.onrender.com';

const getAuthToken = () => {
  const user = localStorage.getItem('user');
  if (user) {
    return JSON.parse(user).token;
  }
  return null;
};

export interface MissingPlayerCandidate {
  action: string;
  segment: string;
  status: string;
  proposed_zpin: string;
  full_name: string;
  first_name: string;
  last_name: string;
  gender: string;
  date_of_birth: string;
  club: string;
  phone: string;
  email: string;
  ranking_source_ids: string;
  categories: string;
  matched_player_id: string;
  current_zpin: string;
  match_method: string;
  notes: string;
}

export interface DetectionSummary {
  total: number;
  ok: number;
  missing: number;
  missingSeniors: number;
  missingJuniors: number;
  noZpin: number;
  noZpinSeniors: number;
  noZpinJuniors: number;
  ambiguous: number;
  actionable: number;
  actionableSeniors: number;
  actionableJuniors: number;
}

export interface ImportReportDetail {
  rowNum?: number;
  action: string;
  name?: string;
  zpin?: string;
  playerId?: string;
  reason?: string;
  error?: string;
  message?: string;
}

export interface ImportReport {
  timestamp: string;
  filename: string;
  userId: string;
  dryRun: boolean;
  totalRows: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  details: ImportReportDetail[];
}

export const missingPlayersService = {
  async detect(): Promise<{ summary: DetectionSummary; candidates: MissingPlayerCandidate[] }> {
    const token = getAuthToken();
    const response = await fetch(`${API_URL}/api/missing-players/detect`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Detection failed');
    return { summary: data.summary, candidates: data.candidates };
  },

  getExportCSVUrl(): string {
    return `${API_URL}/api/missing-players/export/csv`;
  },

  getExportXLSXUrl(): string {
    return `${API_URL}/api/missing-players/export/xlsx`;
  },

  async downloadExport(format: 'csv' | 'xlsx'): Promise<void> {
    const token = getAuthToken();
    const url = format === 'csv' ? this.getExportCSVUrl() : this.getExportXLSXUrl();

    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({ message: 'Download failed' }));
      throw new Error(data.message || 'Download failed');
    }

    const blob = await response.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    const dateStr = new Date().toISOString().split('T')[0];
    a.download = `ZTA_Missing_Players_${dateStr}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  },

  async importFile(file: File, dryRun: boolean = false): Promise<{ success: boolean; report: ImportReport }> {
    const token = getAuthToken();
    const formData = new FormData();
    formData.append('file', file);

    const url = `${API_URL}/api/missing-players/import${dryRun ? '?dryRun=true' : ''}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData,
    });

    const data = await response.json();
    if (!response.ok && !data.report) {
      throw new Error(data.message || 'Import failed');
    }
    return data;
  },
};
