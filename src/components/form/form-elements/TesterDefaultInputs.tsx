import ComponentCard from "../../common/ComponentCard.tsx";
import Label from "../Label.tsx";
import Input from "../input/InputField.tsx";

interface TesterDefaultInputsProps {
  testName: string;
  onTestNameChange: (value: string) => void;
  projectName: string;
  onProjectNameChange: (value: string) => void;
}

export default function TesterDefaultInputs({
  testName,
  onTestNameChange,
  projectName,
  onProjectNameChange,
}: TesterDefaultInputsProps) {
  return (
    <ComponentCard title="Test Config">
      <div className="space-y-6">
        <div>
          <Label htmlFor="inputTwo">Test Name</Label>
          <Input
            type="text"
            value={testName}
            onChange={(e) => onTestNameChange(e.target.value)}
            id="inputTwo"
          />
        </div>
        <div>
          <Label htmlFor="input">Project Name</Label>
          <Input
            type="text"
            value={projectName}
            onChange={(e) => onProjectNameChange(e.target.value)}
            id="input"
          />
        </div>
      </div>
    </ComponentCard>
  );
}
