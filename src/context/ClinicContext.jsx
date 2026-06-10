import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { fetchPublicApi } from '../config/api';
import { syncBrandingMetadata } from '../utils/branding';

const ClinicContext = createContext(null);

const defaultClinicInfo = {
  name: 'The Smile Expert',
  tagline: 'Premium Dental Care Portal',
  logo: 'SE',
  address: 'Dental Clinic, Lahore, Pakistan',
  phone: '+92 42 111 764 533',
  whatsapp: '+92 300 764 5330',
  email: 'care@thesmileexpert.com',
  website: 'portal.thesmileexpert.com',
  registrationNo: 'DENT-LHR-2026-001',
  invoicePrefix: 'TSE',
  invoiceFooter: 'Thank you for choosing The Smile Expert. Keep smiling with precise dental care and transparent billing.',
  paymentTerms: 'Pending balances are shown on every invoice and should be cleared before the next appointment unless approved by admin.',
  mission: 'Deliver premium, transparent, and patient-friendly dental care through organized digital operations.',
  vision: 'To become the most trusted dental clinic experience for families, smile makeovers, implants, and preventive care.',
  servicesOverview: 'Dental checkups, scaling, whitening, fillings, root canals, crowns, veneers, implants, aligners, extractions, and follow-up care.',
  branches: ['The Smile Expert Main Branch'],
  activeBranch: 'Main Dental Clinic',
  specialties: ['dental'],
};

export function ClinicProvider({ children }) {
  const [activeSpecialty, setActiveSpecialty] = useState('all');
  const [clinicInfo, setClinicInfo] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('clinic_branding') || 'null');
      if (!saved || saved.name !== defaultClinicInfo.name) return defaultClinicInfo;
      return { ...defaultClinicInfo, ...saved, specialties: ['dental'] };
    } catch (_) {
      return defaultClinicInfo;
    }
  });

  useEffect(() => {
    localStorage.setItem('clinic_branding', JSON.stringify(clinicInfo));
    const root = document.documentElement;
    if (clinicInfo.primaryColor) root.style.setProperty('--primary', clinicInfo.primaryColor);
    if (clinicInfo.secondaryColor) root.style.setProperty('--secondary', clinicInfo.secondaryColor);
    if (clinicInfo.font) root.style.setProperty('--font-family', clinicInfo.font);
    syncBrandingMetadata(clinicInfo);
  }, [clinicInfo]);

  useEffect(() => {
    // White-label: ask the API which clinic owns this domain and brand the
    // portal (incl. the login screen) accordingly. The domain is sent
    // explicitly so it works even when the API lives on a different host
    // (e.g. portal.thesmilexperts.com talking to app.crea8ivmedia.com).
    const domain = window.location.hostname;
    fetchPublicApi(`/public/branding?domain=${encodeURIComponent(domain)}`)
      .then((data) => {
        if (data?.matched && data.clinic) {
          setClinicInfo((current) => ({ ...current, ...data.clinic }));
        }
      })
      .catch(() => {});
  }, []);

  const updateClinicInfo = (updates) => {
    setClinicInfo((current) => ({ ...current, ...updates }));
  };

  const value = useMemo(() => ({
    activeSpecialty,
    setActiveSpecialty,
    clinicInfo,
    updateClinicInfo,
  }), [activeSpecialty, clinicInfo]);

  return (
    <ClinicContext.Provider value={value}>
      {children}
    </ClinicContext.Provider>
  );
}

export function useClinic() {
  return useContext(ClinicContext);
}
