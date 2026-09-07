'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { PoolShelter, VendorTravel, Driver } from '@/types/database';
import { ArrowLeft, Car, MapPin, Plus, Save, Phone } from 'lucide-react';

export default function PengaturanTravelPage() {
  const [shelters, setShelters] = useState<PoolShelter[]>([]);
  const [vendors, setVendors] = useState<VendorTravel[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);

  // Form input baru
  const [newShelterName, setNewShelterName] = useState('');
  const [newDriverName, setNewDriverName] = useState('');
  const [newDriverHp, setNewDriverHp] = useState('');
  const [newDriverPolisi, setNewDriverPolisi] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: sData } = await supabase.from('pool_shelter').select('*').order('nama');
      if (sData) setShelters(sData as PoolShelter[]);

      const { data: vData } = await supabase.from('vendor_travel').select('*').order('nama');
      if (vData) setVendors(vData as VendorTravel[]);

      const { data: dData } = await supabase.from('driver').select('*').order('nama');
      if (dData) setDrivers(dData as Driver[]);
    } catch (err) {
      console.warn(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddShelter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShelterName.trim()) return;

    try {
      const supabase = createClient();
      await supabase.from('pool_shelter').insert({ nama: newShelterName.trim() });
      setNewShelterName('');
      loadData();
    } catch (err) {
      console.warn(err);
    }
  };

  const handleAddDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDriverName.trim() || vendors.length === 0) return;

    try {
      const supabase = createClient();
      await supabase.from('driver').insert({
        vendor_travel_id: vendors[0].id,
        nama: newDriverName.trim(),
        no_hp: newDriverHp.trim() || null,
        no_polisi_default: newDriverPolisi.trim() || null,
      });
      setNewDriverName('');
      setNewDriverHp('');
      setNewDriverPolisi('');
      loadData();
    } catch (err) {
      console.warn(err);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/pengaturan"
          className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900">
            Pool Shelter, Vendor & Driver
          </h1>
          <p className="text-xs text-slate-500">
            Daftar titik kumpul shelter lapangan, rekanan vendor carter, dan data driver
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* POOL SHELTER */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <MapPin className="w-5 h-5 text-amber-600" />
            <h2 className="font-bold text-sm text-slate-900">Pool Shelter Titik Kumpul</h2>
          </div>

          <form onSubmit={handleAddShelter} className="flex gap-2">
            <input
              type="text"
              value={newShelterName}
              onChange={(e) => setNewShelterName(e.target.value)}
              placeholder="Nama Shelter Baru..."
              className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:border-sky-500"
            />
            <button
              type="submit"
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold"
            >
              Tambah
            </button>
          </form>

          <div className="divide-y divide-slate-100">
            {shelters.map((s) => (
              <div key={s.id} className="py-2.5 flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-800">{s.nama}</span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                  Aktif
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* DRIVER & VENDOR */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Car className="w-5 h-5 text-sky-600" />
            <h2 className="font-bold text-sm text-slate-900">Driver & Kendaraan Lapangan</h2>
          </div>

          <form onSubmit={handleAddDriver} className="space-y-2">
            <input
              type="text"
              required
              value={newDriverName}
              onChange={(e) => setNewDriverName(e.target.value)}
              placeholder="Nama Driver..."
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-hidden"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={newDriverHp}
                onChange={(e) => setNewDriverHp(e.target.value)}
                placeholder="No HP (08...)"
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900"
              />
              <input
                type="text"
                value={newDriverPolisi}
                onChange={(e) => setNewDriverPolisi(e.target.value)}
                placeholder="No Polisi (BG...)"
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold"
            >
              + Tambah Driver
            </button>
          </form>

          <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto">
            {drivers.map((d) => (
              <div key={d.id} className="py-2.5 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-slate-800">{d.nama}</div>
                  <div className="text-[11px] text-slate-500">{d.no_hp || ''}</div>
                </div>
                {d.no_polisi_default && (
                  <span className="font-mono text-[11px] font-bold px-2 py-0.5 bg-slate-100 rounded text-slate-700">
                    {d.no_polisi_default}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
