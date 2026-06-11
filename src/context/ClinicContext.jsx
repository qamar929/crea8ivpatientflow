import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { fetchPublicApi } from '../config/api';
import { syncBrandingMetadata } from '../utils/branding';

const ClinicContext = createContext(null);

// Platform brand shown on the shared/superadmin login at crea8ivmedia.com and
// on any domain not claimed by a clinic. White-label clinic domains override
// this via the /public/branding lookup below.
const defaultClinicInfo = {
  name: 'Crea8iv PatientFlow',
  tagline: 'Clinic Management Platform',
  logo: 'PF',
  address: 'Crea8iv Media, Islamabad, Pakistan',
  phone: '+92 310 5704555',
  whatsapp: '+92 310 5704555',
  email: 'info@crea8ivmedia.com',
  website: 'crea8ivmedia.com',
  registrationNo: '',
  invoicePrefix: 'PF',
  invoiceFooter: 'Powered by Crea8iv PatientFlow.',
  paymentTerms: 'Pending balances are shown on every invoice and should be cleared before the next appointment unless approved by admin.',
  mission: 'Help clinics run premium, transparent, patient-friendly operations through one digital platform.',
  vision: 'To be the operating system modern clinics rely on every day.',
  servicesOverview: 'Appointments, patient records, billing, inventory, staff, marketing and reporting — in one portal.',
  branches: [],
  activeBranch: '',
  specialties: ['dental'],
  primaryColor: '#f97316',
  secondaryColor: '#ea580c',
};

export function ClinicProvider({ children }) {
  const [activeSpecialty, setActiveSpecialty] = useState('all');
  // True once /public/branding confirms a clinic owns this domain. While false
  // (e.g. the platform domain crea8ivmedia.com) the portal shows PatientFlow.
  const [clinicMatched, setClinicMatched] = useState(false);
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
          setClinicMatched(true);
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
    clinicMatched,
    isPlatform: !clinicMatched,
  }), [activeSpecialty, clinicInfo, clinicMatched]);

  return (
    <ClinicContext.Provider value={value}>
      {children}
    </ClinicContext.Provider>
  );
}

export function useClinic() {
  return useContext(ClinicContext);
}
