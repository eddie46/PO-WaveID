import React, { useState } from 'react';
import { 
  GitBranch, 
  GitCommit, 
  GitPullRequest, 
  CheckCircle2, 
  Copy, 
  Check, 
  Download, 
  Terminal, 
  ShieldCheck, 
  Layers, 
  Rocket, 
  Server, 
  Database,
  ExternalLink,
  Code2
} from 'lucide-react';
import { PurchaseOrder, Vendor, GitHubSyncConfig } from '../types/po';
import { githubService } from '../services/githubService';

interface GitHubArchitectureViewProps {
  orders: PurchaseOrder[];
  vendors: Vendor[];
  gitConfig: GitHubSyncConfig;
  onUpdateGitConfig: (config: GitHubSyncConfig) => void;
  onTriggerSyncAll: () => Promise<void>;
  isSyncing: boolean;
  syncResult: string | null;
}

export const GitHubArchitectureView: React.FC<GitHubArchitectureViewProps> = ({
  orders,
  vendors,
  gitConfig,
  onUpdateGitConfig,
  onTriggerSyncAll,
  isSyncing,
  syncResult,
}) => {
  const [activeWorkflowTab, setActiveWorkflowTab] = useState<'deploy' | 'audit' | 'repo'>('deploy');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Local config form state
  const [owner, setOwner] = useState(gitConfig.repoOwner);
  const [repo, setRepo] = useState(gitConfig.repoName);
  const [branch, setBranch] = useState(gitConfig.branch);
  const [token, setToken] = useState(gitConfig.token || '');
  const [selectedPOToInspect, setSelectedPOToInspect] = useState<string>(orders[0]?.poNumber || '');

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateGitConfig({
      repoOwner: owner.trim(),
      repoName: repo.trim(),
      branch: branch.trim(),
      path: 'data/purchase-orders',
      token: token.trim(),
    });
  };

  const currentInspectedPO = orders.find((o) => o.poNumber === selectedPOToInspect) || orders[0];
  const inspectedJson = currentInspectedPO ? githubService.formatPOJson(currentInspectedPO) : '{}';

  return (
    <div className="space-y-8 py-6">
      {/* Hero / Direct Answer Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-md border border-slate-800">
        <div className="flex items-center gap-2 text-indigo-400 text-xs font-mono mb-2">
          <GitBranch className="w-4 h-4" />
          <span>Panduan Arsitektur & Implementasi Sistem PO</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white max-w-3xl">
          Apakah dengan GitHub Bisa Membuat Sistem Purchase Order (PO) Berbasis Web?
        </h1>
        <div className="mt-3 flex items-center gap-2">
          <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 font-bold text-xs rounded-full border border-emerald-500/30">
            ✓ JAWABAN: YA, SANGAT BISA & SANGAT DIREKOMENDASIKAN!
          </span>
        </div>
        <p className="mt-4 text-slate-300 text-sm leading-relaxed max-w-4xl">
          GitHub bukan hanya tempat menyimpan kode, melainkan platform komprehensif yang menyediakan
          <strong> CI/CD deployment gratis (GitHub Actions)</strong>, <strong>hosting web (GitHub Pages)</strong>,
          <strong> audit trail anti-manipulasi (Git Commits)</strong>, serta integrasi webhook ke Slack/Email untuk persetujuan anggaran perusahaan.
        </p>

        {/* Quick Summary Pill Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800/80 text-xs">
          <div>
            <div className="text-slate-400">1. Repository Kode</div>
            <div className="font-semibold text-white mt-0.5">React, Next.js, Express</div>
          </div>
          <div>
            <div className="text-slate-400">2. Otomatisasi CI/CD</div>
            <div className="font-semibold text-white mt-0.5">GitHub Actions Workflow</div>
          </div>
          <div>
            <div className="text-slate-400">3. Audit Trail Abadi</div>
            <div className="font-semibold text-white mt-0.5">Git Commit SHA Hash</div>
          </div>
          <div>
            <div className="text-slate-400">4. Hosting Web</div>
            <div className="font-semibold text-white mt-0.5">GitHub Pages / Cloud Run</div>
          </div>
        </div>
      </div>

      {/* 4 Pillars Architecture Breakdown */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-indigo-600" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            4 Cara Utama Menggunakan GitHub untuk Sistem Purchase Order
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
          {/* Card 1: Hosting & Frontend */}
          <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-xs space-y-2.5">
            <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center font-bold">
              <Rocket className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              1. Deployment Otomatis (GitHub Pages / Actions)
            </h3>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              Aplikasi web PO (seperti yang Anda jalankan saat ini) dapat di-host langsung secara gratis via <strong>GitHub Pages</strong> atau dihubungkan ke server cloud (Vercel, Netlify, atau Google Cloud Run) setiap kali ada commit baru ke branch <code className="font-mono text-indigo-600">main</code>.
            </p>
          </div>

          {/* Card 2: Git-as-a-Database Audit Trail */}
          <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-xs space-y-2.5">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              2. Audit Trail Anti-Manipulasi (Git Commits)
            </h3>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              Dalam pengadaan barang, akuntabilitas itu mutlak. Setiap kali PO dibuat, disetujui manager, atau diterima gudang, Anda dapat meng-commit file JSON status PO ke repository. Karena Git memakai kriptografi SHA, <strong>riwayat persetujuan tidak bisa dipalsukan</strong>.
            </p>
          </div>

          {/* Card 3: Pull Request sebagai Approval Workflow */}
          <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-xs space-y-2.5">
            <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center font-bold">
              <GitPullRequest className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              3. Persetujuan Formal via GitHub Pull Requests
            </h3>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              Untuk pengadaan bernilai tinggi (misal &gt; Rp 100 Juta), sistem dapat membuat Pull Request (PR) otomatis. Direktur / Manager Keuangan meninjau rincian biaya langsung di GitHub dan melakukan klik <strong>"Approve &amp; Merge"</strong> untuk otorisasi dana.
            </p>
          </div>

          {/* Card 4: Webhook & Notifikasi Otomatis */}
          <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-xs space-y-2.5">
            <div className="w-9 h-9 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center font-bold">
              <Terminal className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              4. Webhook &amp; Notifikasi Multi-Channel
            </h3>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              Melalui GitHub Webhook atau GitHub Actions, begitu PO disetujui, event dapat dikirim otomatis ke ERP perusahaan, notifikasi channel Slack/WhatsApp tim purchasing, atau kirim email PDF langsung ke vendor.
            </p>
          </div>
        </div>
      </div>

      {/* Interactive Git Commit Simulator & JSON Viewer */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700/80 p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <GitCommit className="w-5 h-5 text-indigo-600" />
              <span>Simulasi &amp; Sinkronisasi PO ke GitHub Repository</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Lihat bagaimana setiap dokumen PO diubah menjadi berkas JSON version-controlled yang siap di-commit ke repositori Anda.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => githubService.downloadJsonExport(orders, vendors)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh Arsip JSON Lengkap</span>
            </button>

            <button
              onClick={onTriggerSyncAll}
              disabled={isSyncing}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-xs disabled:opacity-50"
            >
              <GitCommit className="w-3.5 h-3.5" />
              <span>{isSyncing ? 'Sedang Memproses...' : 'Jalankan Commit Git Semua PO'}</span>
            </button>
          </div>
        </div>

        {syncResult && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 rounded-lg border border-emerald-200 dark:border-emerald-800 text-xs font-mono">
            {syncResult}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
          {/* Settings Form */}
          <div className="space-y-4 text-xs">
            <form onSubmit={handleSaveConfig} className="space-y-3 bg-slate-50 dark:bg-slate-850 p-4 rounded-xl border border-slate-200 dark:border-slate-750">
              <div className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                Konfigurasi Target GitHub Repo:
              </div>

              <div className="space-y-1">
                <label className="text-slate-600 dark:text-slate-400 font-medium">Owner / Organization</label>
                <input
                  type="text"
                  value={owner}
                  onChange={(e) => setOwner(e.target.value)}
                  placeholder="misal: nama-akun-github"
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-600 dark:text-slate-400 font-medium">Nama Repository</label>
                <input
                  type="text"
                  value={repo}
                  onChange={(e) => setRepo(e.target.value)}
                  placeholder="purchase-order-system"
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-600 dark:text-slate-400 font-medium">Branch</label>
                <input
                  type="text"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  placeholder="main"
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-600 dark:text-slate-400 font-medium">
                  GitHub Personal Access Token (Opsional)
                </label>
                <input
                  type="password"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="ghp_xxxx (kosongkan untuk simulasi lokal)"
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs font-mono"
                />
                <div className="text-[10px] text-slate-400">
                  Jika diisi, sistem akan melakukan commit sungguhan via GitHub REST API. Jika kosong, sistem mensimulasikan commit lokal secara aman.
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-1.5 text-xs font-semibold bg-slate-900 text-white rounded hover:bg-slate-800 transition-colors"
              >
                Simpan Konfigurasi
              </button>
            </form>
          </div>

          {/* Inspected PO JSON Preview */}
          <div className="lg:col-span-2 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Pilih Dokumen PO:</span>
                <select
                  value={selectedPOToInspect}
                  onChange={(e) => setSelectedPOToInspect(e.target.value)}
                  className="px-2 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded font-mono text-xs"
                >
                  {orders.map((o) => (
                    <option key={o.id} value={o.poNumber}>
                      {o.poNumber} - {o.vendorName.substring(0, 24)} ({o.status})
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => handleCopy(inspectedJson, 'po-json')}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 hover:text-indigo-600"
              >
                {copiedKey === 'po-json' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'po-json' ? 'Tersalin' : 'Salin JSON'}</span>
              </button>
            </div>

            <div className="bg-slate-900 text-slate-100 p-4 rounded-xl font-mono text-[11px] overflow-x-auto max-h-80 border border-slate-800 shadow-inner">
              <pre>{inspectedJson}</pre>
            </div>
            <div className="text-[11px] text-slate-500 font-mono">
              Lokasi berkas di Git: <span className="text-indigo-600 dark:text-indigo-400">data/purchase-orders/{currentInspectedPO.poNumber}.json</span>
            </div>
          </div>
        </div>
      </div>

      {/* Copyable GitHub Actions Workflow Templates */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700/80 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Code2 className="w-5 h-5 text-indigo-600" />
              <span>Berkas Konfigurasi Siap Pakai untuk Repositori GitHub Anda</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Tinggal salin ke dalam folder <code className="font-mono text-indigo-600">.github/workflows/</code> di repositori Anda.
            </p>
          </div>

          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-850 rounded-lg text-xs">
            <button
              onClick={() => setActiveWorkflowTab('deploy')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                activeWorkflowTab === 'deploy'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              deploy.yml (CI/CD)
            </button>
            <button
              onClick={() => setActiveWorkflowTab('audit')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                activeWorkflowTab === 'audit'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              po-audit.yml (Alert)
            </button>
            <button
              onClick={() => setActiveWorkflowTab('repo')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                activeWorkflowTab === 'repo'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Struktur Folder Repo
            </button>
          </div>
        </div>

        {/* Code Block Container */}
        <div className="relative">
          <button
            onClick={() => {
              const content =
                activeWorkflowTab === 'deploy'
                  ? githubService.getDeployWorkflowYaml()
                  : activeWorkflowTab === 'audit'
                  ? githubService.getAuditWorkflowYaml()
                  : githubService.getRepoStructureBlueprint();
              handleCopy(content, activeWorkflowTab);
            }}
            className="absolute top-3 right-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md text-xs font-mono transition-colors border border-slate-700"
          >
            {copiedKey === activeWorkflowTab ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Tersalin!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Salin Berkas</span>
              </>
            )}
          </button>

          <div className="bg-slate-950 text-slate-200 p-5 rounded-xl font-mono text-xs overflow-x-auto border border-slate-800">
            <pre>
              {activeWorkflowTab === 'deploy' && githubService.getDeployWorkflowYaml()}
              {activeWorkflowTab === 'audit' && githubService.getAuditWorkflowYaml()}
              {activeWorkflowTab === 'repo' && githubService.getRepoStructureBlueprint()}
            </pre>
          </div>
        </div>
      </div>

      {/* 5 Steps Production Roadmap */}
      <div className="bg-slate-50 dark:bg-slate-850 rounded-xl p-6 border border-slate-200 dark:border-slate-750 space-y-4">
        <h3 className="text-base font-bold text-slate-900 dark:text-white">
          Langkah Praktis Membangun Sistem PO dengan GitHub dari Nol
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-xs">
          <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 space-y-1.5">
            <div className="font-bold text-indigo-600 font-mono">01. BIKIN REPO</div>
            <div className="font-bold text-slate-900 dark:text-white">Inisialisasi GitHub</div>
            <p className="text-slate-500 text-[11px] leading-relaxed">
              Buat repository privat (Private Repo) di GitHub akun perusahaan Anda.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 space-y-1.5">
            <div className="font-bold text-indigo-600 font-mono">02. PUSH KODE</div>
            <div className="font-bold text-slate-900 dark:text-white">Aplikasi Web PO</div>
            <p className="text-slate-500 text-[11px] leading-relaxed">
              Push codebase web (React + Vite + Tailwind + TypeScript) ke branch <code className="font-mono">main</code>.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 space-y-1.5">
            <div className="font-bold text-indigo-600 font-mono">03. PILIH DATABASE</div>
            <div className="font-bold text-slate-900 dark:text-white">PostgreSQL / Git Data</div>
            <p className="text-slate-500 text-[11px] leading-relaxed">
              Gunakan Supabase (PostgreSQL), Cloud SQL, atau simpan arsip PO sebagai file JSON.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 space-y-1.5">
            <div className="font-bold text-indigo-600 font-mono">04. PASANG ACTIONS</div>
            <div className="font-bold text-slate-900 dark:text-white">CI/CD Otomatis</div>
            <p className="text-slate-500 text-[11px] leading-relaxed">
              Pasang <code className="font-mono">deploy.yml</code> agar setiap perbaikan otomatis langsung ter-deploy tanpa downtime.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 space-y-1.5">
            <div className="font-bold text-indigo-600 font-mono">05. HUBUNGKAN DOMAIN</div>
            <div className="font-bold text-slate-900 dark:text-white">po.perusahaan.com</div>
            <p className="text-slate-500 text-[11px] leading-relaxed">
              Arahkan DNS domain resmi kantor Anda ke hosting GitHub / Cloud Run. Siap dipakai seluruh divisi!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
