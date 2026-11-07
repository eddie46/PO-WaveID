import { PurchaseOrder, Vendor, GitHubSyncConfig } from '../types/po';

export interface GitCommitRecord {
  sha: string;
  message: string;
  author: string;
  timestamp: string;
  poNumber: string;
  status: string;
  filePath: string;
}

export const githubService = {
  /**
   * Generates sample GitHub Actions workflow for building and deploying the PO web app
   */
  getDeployWorkflowYaml(): string {
    return `name: Deploy Purchase Order Management System

on:
  push:
    branches: [ "main" ]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4

      - name: Setup Node.js 20
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install Dependencies
        run: npm ci

      - name: Run Lint & Typecheck
        run: npm run lint

      - name: Build Web App
        run: npm run build

      - name: Upload GitHub Pages Artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: './dist'

  deploy:
    environment:
      name: github-pages
      url: \${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
`;
  },

  /**
   * Generates sample GitHub Action for automatic PO approval notification and audit logging
   */
  getAuditWorkflowYaml(): string {
    return `name: PO Audit & Slack Notification

on:
  push:
    paths:
      - 'data/purchase-orders/**.json'

jobs:
  audit-and-notify:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4
        with:
          fetch-depth: 2

      - name: Parse Modified Purchase Orders
        id: parse_po
        run: |
          echo "Scanning committed POs for changes..."
          CHANGED_FILES=\$(git diff --name-only HEAD~1 HEAD | grep 'data/purchase-orders/' || true)
          echo "files=\${CHANGED_FILES}" >> \$GITHUB_OUTPUT

      - name: Send Slack / Discord Alert on Approval
        if: steps.parse_po.outputs.files != ''
        run: |
          echo "Purchase Order committed: \${{ steps.parse_po.outputs.files }}"
          # Webhook trigger:
          # curl -X POST -H 'Content-type: application/json' --data '{"text":"[PO System] New PO Commit on GitHub"}' \${{ secrets.SLACK_WEBHOOK_URL }}
`;
  },

  /**
   * Generates repository directory structure blueprint
   */
  getRepoStructureBlueprint(): string {
    return `my-company-po-system/
├── .github/
│   ├── workflows/
│   │   ├── deploy.yml            # CI/CD: build & deploy ke GitHub Pages / Cloud Run
│   │   └── po-audit.yml          # Otomatisasi notifikasi ketika file PO di-commit
│   └── pull_request_template.md  # Template approval PO via GitHub Pull Request
├── data/                         # Git-as-a-Database (Audit Trail Abadi)
│   ├── purchase-orders/
│   │   ├── PO-2026-0038.json
│   │   ├── PO-2026-0039.json
│   │   └── PO-2026-0040.json
│   └── vendors/
│       └── suppliers.json
├── src/                          # Web Application Frontend (React + Vite + Tailwind)
│   ├── components/
│   ├── services/
│   └── App.tsx
├── package.json
└── README.md`;
  },

  /**
   * Helper to serialize a PO to standardized JSON
   */
  formatPOJson(po: PurchaseOrder): string {
    return JSON.stringify(
      {
        poNumber: po.poNumber,
        version: '1.0.0',
        metadata: {
          department: po.department,
          status: po.status,
          createdAt: po.createdAt,
          deliveryDate: po.deliveryDate,
          createdBy: po.createdBy,
        },
        vendor: {
          id: po.vendorId,
          name: po.vendorName,
          pic: po.vendorPic,
          email: po.vendorEmail,
          taxId: po.vendorTaxId,
        },
        financials: {
          currency: po.currency,
          subtotal: po.subtotal,
          taxRate: po.taxRate,
          taxAmount: po.taxAmount,
          discountAmount: po.discountAmount,
          totalAmount: po.totalAmount,
          paymentTerms: po.paymentTerms,
        },
        lineItems: po.items,
        delivery: {
          shippingAddress: po.shippingAddress,
          goodsReceipts: po.goodsReceipts,
        },
        auditLogs: po.approvals,
      },
      null,
      2
    );
  },

  /**
   * Generate pseudo-random realistic Git SHA
   */
  generateCommitSha(): string {
    const chars = '0123456789abcdef';
    let result = '';
    for (let i = 0; i < 7; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  },

  /**
   * Commit a PO to GitHub (Either real GitHub API if PAT provided, or realistic simulation)
   */
  async commitPOToGitHub(
    po: PurchaseOrder,
    config: GitHubSyncConfig,
    commitMessage: string,
    authorName: string
  ): Promise<{ success: boolean; sha: string; message: string; isRealApi: boolean }> {
    const filePath = `${config.path}/${po.poNumber}.json`;
    const jsonContent = this.formatPOJson(po);

    if (config.token && config.token.trim().length > 10) {
      // Real GitHub REST API call
      try {
        const url = `https://api.github.com/repos/${config.repoOwner}/${config.repoName}/contents/${filePath}`;
        
        // Step 1: Check if file already exists to get its current SHA
        let existingSha: string | undefined;
        try {
          const getRes = await fetch(url, {
            headers: {
              Authorization: `Bearer ${config.token}`,
              Accept: 'application/vnd.github.v3+json',
            },
          });
          if (getRes.ok) {
            const getData = await getRes.json();
            existingSha = getData.sha;
          }
        } catch {
          // file doesn't exist yet, that's fine
        }

        // Base64 encode in browser
        const utf8Bytes = new TextEncoder().encode(jsonContent);
        let binaryStr = '';
        utf8Bytes.forEach((b) => (binaryStr += String.fromCharCode(b)));
        const base64Content = btoa(binaryStr);

        const putRes = await fetch(url, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${config.token}`,
            Accept: 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: commitMessage,
            content: base64Content,
            branch: config.branch || 'main',
            sha: existingSha,
          }),
        });

        if (!putRes.ok) {
          const errData = await putRes.json();
          throw new Error(errData.message || 'Gagal push ke GitHub API');
        }

        const data = await putRes.json();
        const shortSha = data.commit?.sha?.substring(0, 7) || this.generateCommitSha();

        return {
          success: true,
          sha: shortSha,
          message: `Berhasil push commit ${shortSha} ke https://github.com/${config.repoOwner}/${config.repoName}`,
          isRealApi: true,
        };
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : 'Error GitHub API';
        console.warn('Real API failed, fallback to simulated commit:', errorMsg);
        // Fallback to simulated
        const simSha = this.generateCommitSha();
        return {
          success: true,
          sha: simSha,
          message: `Simulasi Commit [${simSha}]: ${commitMessage} (Token tidak valid/CORS: ${errorMsg})`,
          isRealApi: false,
        };
      }
    }

    // Default: Realistic local Git commit simulation
    const sha = this.generateCommitSha();
    return {
      success: true,
      sha,
      message: `[Git Commit ${sha}] ${commitMessage} oleh ${authorName} -> ${filePath}`,
      isRealApi: false,
    };
  },

  /**
   * Export all POs and Vendors as a downloadable JSON file
   */
  downloadJsonExport(orders: PurchaseOrder[], vendors: Vendor[]): void {
    const payload = {
      exportTimestamp: new Date().toISOString(),
      repository: 'purchase-order-management-web',
      totalOrders: orders.length,
      orders,
      vendors,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `purchase-orders-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  /**
   * Export orders as CSV
   */
  downloadCSVExport(orders: PurchaseOrder[]): void {
    const headers = [
      'Nomor PO',
      'Tanggal Buat',
      'Status',
      'Departemen',
      'Vendor',
      'Subtotal (IDR)',
      'PPN (IDR)',
      'Total Akhir (IDR)',
      'Termin Bayar',
      'Target Kirim',
      'Dibuat Oleh',
    ];

    const rows = orders.map((o) => [
      `"${o.poNumber}"`,
      `"${o.createdAt.split('T')[0]}"`,
      `"${o.status}"`,
      `"${o.department}"`,
      `"${o.vendorName.replace(/"/g, '""')}"`,
      o.subtotal,
      o.taxAmount,
      o.totalAmount,
      `"${o.paymentTerms}"`,
      `"${o.deliveryDate}"`,
      `"${o.createdBy}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `daftar-purchase-order-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
};
