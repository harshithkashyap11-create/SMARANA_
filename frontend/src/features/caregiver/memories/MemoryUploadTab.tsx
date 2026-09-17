import { useQuery } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { caregiverApi } from "../api";
import { compressMemoryPhotos } from "./compression";

export function MemoryUploadTab({ patientId }: { patientId: string }) {
  const family = useQuery({
    queryKey: ["caregiver", patientId, "family"],
    queryFn: () => caregiverApi.family(patientId),
  });
  const [files, setFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    setSaving(true);
    setMessage("");
    setProgress(0);
    try {
      const form = new FormData(formElement);
      form.delete("photos");
      if (!form.get("occurred_on")) form.delete("occurred_on");
      const compressed = await compressMemoryPhotos(files);
      setProgress(10);
      const memory = await caregiverApi.createMemory(patientId, form);
      for (const [index, file] of compressed.entries()) {
        const media = new FormData();
        media.append("file", file);
        media.append("order", String(index));
        await caregiverApi.addMemoryPhoto(patientId, memory.id, media);
        setProgress(
          10 + Math.round(((index + 1) / Math.max(compressed.length, 1)) * 90),
        );
      }
      setProgress(100);
      setMessage("Memory saved. It is ready to revisit.");
      setFiles([]);
      formElement.reset();
    } catch {
      setMessage("We could not save this memory. Please try again.");
    } finally {
      setSaving(false);
    }
  };
  if (family.isPending) return <p>Loading family…</p>;
  if (family.isError) return <p>We could not load family members right now.</p>;
  return (
    <form
      className="max-w-2xl space-y-4"
      onSubmit={(event) => void submit(event)}
    >
      <h2 className="text-2xl font-bold">Add a memory</h2>
      <label className="block">
        Title
        <input className="mt-1 w-full" name="title" required />
      </label>
      <label className="block">
        Occasion
        <select className="mt-1 w-full" name="occasion" defaultValue="daily">
          <option value="birthday">Birthday</option>
          <option value="festival">Festival</option>
          <option value="wedding">Wedding</option>
          <option value="trip">Trip</option>
          <option value="daily">Everyday moment</option>
          <option value="other">Other</option>
        </select>
      </label>
      <label className="block">
        Date
        <input className="mt-1 w-full" name="occurred_on" type="date" />
      </label>
      <label className="block">
        Place
        <input className="mt-1 w-full" name="place" />
      </label>
      <label className="block">
        Short story
        <textarea className="mt-1 w-full" name="summary" required rows={4} />
      </label>
      <fieldset>
        <legend className="font-bold">People in this memory</legend>
        {family.data.length ? (
          family.data.map((person) => (
            <label className="mt-2 flex gap-2" key={person.id}>
              <input name="people" type="checkbox" value={person.id} />
              {person.name} · {person.relationship}
            </label>
          ))
        ) : (
          <p>No family members have been added yet.</p>
        )}
      </fieldset>
      <fieldset>
        <legend className="font-bold">Who can use this memory?</legend>
        <label className="mt-2 block">
          <input
            defaultChecked
            name="visibility"
            type="radio"
            value="private"
          />{" "}
          Only the patient and caregivers
        </label>
        <label className="mt-2 block">
          <input name="visibility" type="radio" value="quiz" /> Use in memory
          questions
        </label>
        <p className="ml-6 text-sm text-muted">
          The photo and story may appear in gentle memory questions.
        </p>
        <label className="mt-2 block">
          <input name="visibility" type="radio" value="care_team" /> Share with
          the care team
        </label>
      </fieldset>
      <label className="block">
        Photos
        <input
          accept="image/*"
          className="mt-1 block"
          multiple
          name="photos"
          required
          type="file"
          onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
        />
        <span className="text-sm text-muted">
          Photos are made smaller on this device before upload (maximum 1600px).
        </span>
      </label>
      {saving && (
        <progress
          aria-label="Upload progress"
          className="w-full"
          max={100}
          value={progress}
        />
      )}{" "}
      {message && <p role="status">{message}</p>}
      <button
        className="rounded bg-primary px-5 py-3 font-bold text-white disabled:opacity-50"
        disabled={saving}
        type="submit"
      >
        {saving ? "Saving…" : "Save memory"}
      </button>
    </form>
  );
}
