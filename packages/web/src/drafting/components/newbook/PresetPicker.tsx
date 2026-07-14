/** The three formats, side by side. */

import { FORMAT_LIST, type FormatId } from '../../formats.js';
import { PresetCard } from './PresetCard.js';

export function PresetPicker({
  selected,
  onSelect,
}: {
  selected: FormatId;
  onSelect: (id: FormatId) => void;
}) {
  return (
    <div className="nb-presets">
      {FORMAT_LIST.map((format) => (
        <PresetCard
          key={format.id}
          format={format}
          selected={selected === format.id}
          onSelect={() => onSelect(format.id)}
        />
      ))}
    </div>
  );
}
