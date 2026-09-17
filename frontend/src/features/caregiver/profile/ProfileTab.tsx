import { supportedLanguages, languageNames } from "../../../shared/i18n";
import { useEffect, useState } from "react";
import { caregiverApi, type PatientProfile } from "../api";

const regions = [["AS", "Assam"], ["AR", "Arunachal Pradesh"], ["MN", "Manipur"], ["ML", "Meghalaya"], ["MZ", "Mizoram"], ["NL", "Nagaland"], ["SK", "Sikkim"], ["TR", "Tripura"]] as const;
export function ProfileTab({ patientId }: { patientId: string }) {
  const [profile, setProfile] = useState<PatientProfile>({ region: "AS", cultural_notes: "", language: "en" });
  const [saved, setSaved] = useState(false);
  useEffect(() => { void caregiverApi.profile(patientId).then(setProfile); }, [patientId]);
  return <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); void caregiverApi.updateProfile(patientId, profile).then((value) => { setProfile(value); setSaved(true); }); }}><h2 className="text-xl font-bold">Regional preferences</h2><label className="block font-bold">Region<select aria-label="Region" className="mt-2 min-h-touch w-full rounded-card border-2 border-primary bg-surface px-4" value={profile.region} onChange={(event) => setProfile({ ...profile, region: event.target.value })}>{regions.map(([code, name]) => <option key={code} value={code}>{name}</option>)}</select></label><label className="block font-bold">Language<select aria-label="Language" className="mt-2 min-h-touch w-full rounded-card border-2 border-primary bg-surface px-4" value={profile.language} onChange={(event) => setProfile({ ...profile, language: event.target.value })}>{supportedLanguages.map((language) => <option key={language} value={language}>{languageNames[language]}</option>)}</select></label><label className="block font-bold">Cultural background<textarea aria-label="Cultural background" className="mt-2 min-h-28 w-full rounded-card border-2 border-primary bg-surface p-3" value={profile.cultural_notes} onChange={(event) => setProfile({ ...profile, cultural_notes: event.target.value })} /></label><button className="min-h-touch rounded-card bg-primary px-5 text-white" type="submit">Save preferences</button>{saved && <p role="status">Saved.</p>}</form>;
}
