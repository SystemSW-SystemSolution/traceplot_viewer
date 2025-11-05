import ComponentCard from "../../common/ComponentCard";
import Checkbox from "../input/Checkbox";

type FeatureOption =
  | "JEDEC-HID"
  | "JEDEC-FBO"
  | "FBO"
  | "HWSnapshot"
  | "TurboWrite"
  | "WriteBooster"
  | "XLC Buffering";

interface FeatureCheckboxProps {
  selectedFeatures: FeatureOption[];
  onChange: (features: FeatureOption[]) => void;
}

const features: FeatureOption[] = [
  "JEDEC-HID",
  "JEDEC-FBO",
  "FBO",
  "HWSnapshot",
  "TurboWrite",
  "WriteBooster",
  "XLC Buffering",
];

export default function FeatureCheckboxComponents({
  selectedFeatures,
  onChange,
}: FeatureCheckboxProps) {
  const handleToggle = (feature: FeatureOption) => {
    const updated = selectedFeatures.includes(feature)
      ? selectedFeatures.filter((f) => f !== feature)
      : [...selectedFeatures, feature];
    onChange(updated);
  };

  return (
    <ComponentCard title="Features">
      <div className="flex flex-wrap items-center gap-10">
        {features.map((feature) => (
          <div className="flex items-center gap-3">
            <Checkbox
              checked={selectedFeatures.includes(feature)}
              onChange={() => handleToggle(feature)}
              label={feature}
            />
          </div>
        ))}
        {/* <div className="flex items-center gap-3">
          <Checkbox
            checked={isCheckedDisabled}
            onChange={setIsCheckedDisabled}
            disabled
            label="HWSnapshot"
          />
        </div> */}
      </div>
    </ComponentCard>
  );
}
