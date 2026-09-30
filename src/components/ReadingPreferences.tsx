import { useId } from "react";
import { stopSpeaking } from "../lib/audio";
import { useSettings } from "../state/settings";

export default function ReadingPreferences() {
  const id = useId();
  const { textSize, speechRate, setTextSize, setSpeechRate } = useSettings();
  return (
    <fieldset className="reading-preferences">
      <legend className="text-caption text-text-dim">
        Make the reading yours
      </legend>
      <label htmlFor={`${id}-size`}>
        Text size
        <select
          id={`${id}-size`}
          value={textSize}
          onChange={(event) => setTextSize(Number(event.target.value))}
        >
          <option value={18}>Standard</option>
          <option value={22}>Large</option>
          <option value={28}>Extra large</option>
          <option value={34}>Largest</option>
        </select>
      </label>
      <label htmlFor={`${id}-speed`}>
        Reading speed
        <select
          id={`${id}-speed`}
          value={speechRate}
          onChange={(event) => {
            stopSpeaking();
            setSpeechRate(Number(event.target.value));
          }}
        >
          <option value={0.6}>Slower · 0.6×</option>
          <option value={0.8}>Gentle · 0.8×</option>
          <option value={1}>Normal · 1×</option>
          <option value={1.2}>Faster · 1.2×</option>
        </select>
      </label>
    </fieldset>
  );
}
