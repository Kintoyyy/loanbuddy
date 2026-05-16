const STORAGE_KEY = "loanbuddy_agreement_settings";

export interface AgreementSettings {
  lenderNameOverride: string;
  additionalTerms: string;
}

const defaults: AgreementSettings = {
  lenderNameOverride: "",
  additionalTerms: "",
};

export function getAgreementSettings(): AgreementSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaults };
    return { ...defaults, ...(JSON.parse(raw) as Partial<AgreementSettings>) };
  } catch {
    return { ...defaults };
  }
}

export function saveAgreementSettings(settings: AgreementSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}
