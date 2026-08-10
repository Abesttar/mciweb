'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Region {
    id: string;
    name: string;
}

interface AddressSelectorProps {
    value: string;
    onChange: (value: string) => void;
}

export function AddressSelector({ value, onChange }: AddressSelectorProps) {
    const [provinces, setProvinces] = useState<Region[]>([]);
    const [regencies, setRegencies] = useState<Region[]>([]);
    const [districts, setDistricts] = useState<Region[]>([]);
    const [villages, setVillages] = useState<Region[]>([]);

    const [selectedProv, setSelectedProv] = useState<Region | null>(null);
    const [selectedReg, setSelectedReg] = useState<Region | null>(null);
    const [selectedDist, setSelectedDist] = useState<Region | null>(null);
    const [selectedVill, setSelectedVill] = useState<Region | null>(null);
    const [detail, setDetail] = useState('');

    const [isInitialized, setIsInitialized] = useState(false);

    useEffect(() => {
        // Fetch provinces
        axios.get('https://www.emsifa.com/api-wilayah-indonesia/api/provinces.json')
            .then(res => setProvinces(res.data))
            .catch(console.error);
    }, []);

    // Effect to parse incoming value when it is loaded
    useEffect(() => {
        if (!isInitialized && value && provinces.length > 0) {
            // Address format: [Detail], [Village], [District], [Regency], [Province]
            // We can only do best effort because EMSIFA names might differ slightly, or just set detail to full string if we can't parse it.
            // For simplicity, if we can't parse, just dump into detail.
            const parts = value.split(', ').reverse(); // Province is last
            if (parts.length >= 4) {
                const provName = parts[0];
                const regName = parts[1];
                const distName = parts[2];
                const villName = parts[3];
                const detailStr = parts.slice(4).reverse().join(', ');

                const p = provinces.find(x => x.name === provName);
                if (p) {
                    setSelectedProv(p);
                    axios.get(`https://www.emsifa.com/api-wilayah-indonesia/api/regencies/${p.id}.json`)
                        .then(res => {
                            setRegencies(res.data);
                            const r = res.data.find((x: Region) => x.name === regName);
                            if (r) {
                                setSelectedReg(r);
                                axios.get(`https://www.emsifa.com/api-wilayah-indonesia/api/districts/${r.id}.json`)
                                    .then(res2 => {
                                        setDistricts(res2.data);
                                        const d = res2.data.find((x: Region) => x.name === distName);
                                        if (d) {
                                            setSelectedDist(d);
                                            axios.get(`https://www.emsifa.com/api-wilayah-indonesia/api/villages/${d.id}.json`)
                                                .then(res3 => {
                                                    setVillages(res3.data);
                                                    const v = res3.data.find((x: Region) => x.name === villName);
                                                    if (v) setSelectedVill(v);
                                                    setDetail(detailStr);
                                                });
                                        } else setDetail(value);
                                    });
                            } else setDetail(value);
                        });
                } else setDetail(value);
            } else {
                setDetail(value);
            }
            setIsInitialized(true);
        } else if (!isInitialized && provinces.length > 0 && !value) {
            setIsInitialized(true);
        }
    }, [value, provinces, isInitialized]);

    useEffect(() => {
        if (!isInitialized) return;
        
        let formatted = detail;
        const parts = [];
        if (selectedVill) parts.push(selectedVill.name);
        if (selectedDist) parts.push(selectedDist.name);
        if (selectedReg) parts.push(selectedReg.name);
        if (selectedProv) parts.push(selectedProv.name);

        if (parts.length > 0) {
            formatted = detail ? `${detail}, ${parts.join(', ')}` : parts.join(', ');
        }
        
        if (value !== formatted) {
            onChange(formatted);
        }
    }, [detail, selectedProv, selectedReg, selectedDist, selectedVill, isInitialized, onChange, value]);

    const handleProvChange = (id: string | null) => {
        const p = provinces.find(x => x.id === id);
        setSelectedProv(p || null);
        setSelectedReg(null);
        setSelectedDist(null);
        setSelectedVill(null);
        setRegencies([]);
        setDistricts([]);
        setVillages([]);
        if (p) {
            axios.get(`https://www.emsifa.com/api-wilayah-indonesia/api/regencies/${p.id}.json`)
                .then(res => setRegencies(res.data));
        }
    };

    const handleRegChange = (id: string | null) => {
        const r = regencies.find(x => x.id === id);
        setSelectedReg(r || null);
        setSelectedDist(null);
        setSelectedVill(null);
        setDistricts([]);
        setVillages([]);
        if (r) {
            axios.get(`https://www.emsifa.com/api-wilayah-indonesia/api/districts/${r.id}.json`)
                .then(res => setDistricts(res.data));
        }
    };

    const handleDistChange = (id: string | null) => {
        const d = districts.find(x => x.id === id);
        setSelectedDist(d || null);
        setSelectedVill(null);
        setVillages([]);
        if (d) {
            axios.get(`https://www.emsifa.com/api-wilayah-indonesia/api/villages/${d.id}.json`)
                .then(res => setVillages(res.data));
        }
    };

    const handleVillChange = (id: string | null) => {
        const v = villages.find(x => x.id === id);
        setSelectedVill(v || null);
    };

    return (
        <div className="grid gap-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Select value={selectedProv?.id || ''} onValueChange={handleProvChange}>
                    <SelectTrigger>
                        <SelectValue placeholder="Pilih Provinsi">
                            {selectedProv ? selectedProv.name : "Pilih Provinsi"}
                        </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                        {provinces.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                </Select>

                <Select value={selectedReg?.id || ''} onValueChange={handleRegChange} disabled={!selectedProv}>
                    <SelectTrigger>
                        <SelectValue placeholder="Pilih Kabupaten/Kota">
                            {selectedReg ? selectedReg.name : "Pilih Kabupaten/Kota"}
                        </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                        {regencies.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                    </SelectContent>
                </Select>

                <Select value={selectedDist?.id || ''} onValueChange={handleDistChange} disabled={!selectedReg}>
                    <SelectTrigger>
                        <SelectValue placeholder="Pilih Kecamatan">
                            {selectedDist ? selectedDist.name : "Pilih Kecamatan"}
                        </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                        {districts.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                    </SelectContent>
                </Select>

                <Select value={selectedVill?.id || ''} onValueChange={handleVillChange} disabled={!selectedDist}>
                    <SelectTrigger>
                        <SelectValue placeholder="Pilih Desa/Kelurahan">
                            {selectedVill ? selectedVill.name : "Pilih Desa/Kelurahan"}
                        </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                        {villages.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            
            <Input 
                placeholder="Detail Alamat (Jalan, RT/RW, Patokan)" 
                value={detail} 
                onChange={e => setDetail(e.target.value)}
            />
        </div>
    );
}
