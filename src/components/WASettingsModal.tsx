import React, { useState } from 'react';
import { X, MessageSquare, Link, Phone, Check } from 'lucide-react';
import { WAConfig } from '../types/po';

interface WASettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: WAConfig;
  onSave: (newConfig: WAConfig) => void;
}

export const WASettingsModal: React.FC<WASettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onSave,
}) => {
  if (!isOpen) return null;

  const [mode, setMode] = useState<'group_link' | 'phone_number'>(config.mode);
  const [groupLink, setGroupLink] = useState(config.groupLink);
  const [phoneNumber, setPhoneNumber] = useState(config.phoneNumber);
  const [groupName, setGroupName] = useState(config.groupName);
  const [paidGroupLink, setPaidGroupLink] = useState(
    config.paidGroupLink || 'https://chat.whatsapp.com/GrupPCBUtamaLunas'
  );
  const [paidGroupName, setPaidGroupName] = useState(
    config.paidGroupName || 'Grup Pembeli LUNAS & Resi'
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      mode,
      groupLink: groupLink.trim(),
      phoneNumber: phoneNumber.trim(),
      groupName: groupName.trim() || 'Grup Order WA',
      paidGroupLink: paidGroupLink.trim(),
      paidGroupName: paidGroupName.trim() || 'Grup Pembeli LUNAS & Resi',
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in duration-150">
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Pengaturan Tujuan WhatsApp
                </h3>
                <p className="text-[11px] text-slate-500">
                  Tentukan ke mana rincian PO akan dikirimkan
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-4 text-xs">
            {/* Mode selection tabs */}
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                Pilih Jenis Tujuan Pengiriman:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMode('group_link')}
                  className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-colors ${
                    mode === 'group_link'
                      ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Link className="w-4 h-4 text-emerald-600" />
                    {mode === 'group_link' && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                  </div>
                  <div className="mt-2 font-bold text-xs">Grup WhatsApp</div>
                  <div className="text-[10px] text-slate-500">Via tautan undangan grup</div>
                </button>

                <button
                  type="button"
                  onClick={() => setMode('phone_number')}
                  className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-colors ${
                    mode === 'phone_number'
                      ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Phone className="w-4 h-4 text-emerald-600" />
                    {mode === 'phone_number' && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                  </div>
                  <div className="mt-2 font-bold text-xs">Nomor WA Admin</div>
                  <div className="text-[10px] text-slate-500">Langsung ke chat pribadi admin</div>
                </button>
              </div>
            </div>

            {/* Inputs based on mode */}
            {mode === 'group_link' ? (
              <div className="space-y-3 pt-2">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    Tautan / Link Grup WhatsApp Anda *
                  </label>
                  <input
                    type="url"
                    required
                    placeholder="https://chat.whatsapp.com/KodeGrupAnda"
                    value={groupLink}
                    onChange={(e) => setGroupLink(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                  <p className="text-[10px] text-slate-500">
                    Cara ambil: Buka Grup WA &gt; Info Grup &gt; Undang via Tautan &gt; Salin Tautan.
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    Nama Grup (Label Tampilan)
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Grup Order PCB Nusantara"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3 pt-2">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    Nomor WhatsApp Admin / Penerima *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="Contoh: 081234567890 atau 6281234567890"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                  <p className="text-[10px] text-slate-500">
                    Pesan PO akan otomatis terisi dan siap dikirim ke nomor ini saat tombol pesan diklik.
                  </p>
                </div>
              </div>
            )}

            {/* Seksi Khusus: Tautan Grup WhatsApp Pembeli LUNAS */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-400">
                <span>🟢 Link Grup WhatsApp Pembeli LUNAS</span>
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Tautan Undangan Grup WA LUNAS *
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://chat.whatsapp.com/GrupPCBUtamaLunas"
                  value={paidGroupLink}
                  onChange={(e) => setPaidGroupLink(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-300 dark:border-emerald-800 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono"
                />
                <p className="text-[10px] text-slate-500">
                  Ketika admin menekan tombol &quot;Tandai Lunas&quot;, tautan ini otomatis dikirim via WhatsApp ke pembeli untuk bergabung ke grup khusus pembeli lunas.
                </p>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Nama Label Grup WA LUNAS
                </label>
                <input
                  type="text"
                  placeholder="Grup Pembeli LUNAS & Resi"
                  value={paidGroupName}
                  onChange={(e) => setPaidGroupName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-xs"
            >
              Simpan Pengaturan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
