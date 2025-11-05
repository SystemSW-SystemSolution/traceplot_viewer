import { useState } from "react";
import ComponentCard from "../../common/ComponentCard";
import Label from "../Label";
import Select from "../Select";
import Input from "../input/InputField.tsx";
import MultiSelect from "../MultiSelect";

type BoardOption = "8650" | "8750" | "8850";

interface VersionSelectInputsProps {
  onBoardChange: (value: BoardOption) => void;
  branch: string;
  onBranchChange: (value: string) => void;
}

interface SelectOption {
  value: BoardOption;
  label: string;
}

const boardOptions: SelectOption[] = [
  { value: "8650", label: "SM8650" },
  { value: "8750", label: "SM8750" },
  { value: "8850", label: "SM8850" },
];

export default function VersionSelectInputs({
  onBoardChange,
  branch,
  onBranchChange,
}: VersionSelectInputsProps) {
  const handleSelectChange = (value: string) => {
    const board = value as BoardOption;
    if (["8650", "8750", "8850"].includes(board)) {
      onBoardChange(board);
    }
  };

  const handleBranchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onBranchChange(e.target.value);
  };

  return (
    <ComponentCard title="Configure">
      <div className="space-y-6">
        <div>
          <Label>Select Board</Label>
          <Select
            options={boardOptions}
            placeholder="Select Option"
            onChange={handleSelectChange}
            className="dark:bg-dark-900"
          />
        </div>
        <div>
          <Label htmlFor="inputTwo">Branch</Label>
          <Input
            type="text"
            id="inputTwo"
            value={branch}
            onChange={handleBranchChange}
            placeholder="dev-onedriver"
          />
        </div>
      </div>
    </ComponentCard>
  );
}
