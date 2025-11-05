import { useState, useEffect } from "react";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import FeatureCheckboxComponents from "../../components/form/form-elements/FeatureCheckboxComponents";
import DetailTextAreaInput from "../../components/form/form-elements/DetailTextAreaInput";
import VersionSelectInputs from "../../components/form/form-elements/VersionSelectInputs";
import TesterDefaultInputs from "../../components/form/form-elements/TesterDefaultInputs";
import Button from "../../components/ui/button/Button";
import { FileIcon } from "../../icons";

// 유효한 보드 목록
type BoardOption = "8650" | "8750" | "8850";

// 체크박스로 선택 가능한 features 목록
type FeatureOption =
  | "JEDEC-HID"
  | "JEDEC-FBO"
  | "FBO"
  | "HWSnapshot"
  | "TurboWrite"
  | "WriteBooster"
  | "XLC Buffering";

// 폼 상태 인터페이스
interface FormData {
  board: BoardOption | "";
  branch: string;
  testName: string;
  projectName: string;
  features: FeatureOption[];
}

export default function QcomFormElements() {
  const [formData, setFormData] = useState<FormData>({
    board: "",
    branch: "",
    testName: "",
    projectName: "",
    features: [],
  });

  const handleBoardChange = (value: BoardOption) => {
    setFormData((prev) => ({ ...prev, board: value }));
  };

  const handleBranchChange = (value: string) => {
    setFormData((prev) => ({ ...prev, branch: value }));
  };

  const handleTestNameChange = (value: string) => {
    setFormData((prev) => ({ ...prev, testName: value }));
  };

  const handleProjectNameChange = (value: string) => {
    setFormData((prev) => ({ ...prev, projectName: value }));
  };

  const handleFeaturesChange = (selectedFeatures: FeatureOption[]) => {
    setFormData((prev) => ({ ...prev, features: selectedFeatures }));
  };

  const handleSubmit = async () => {
    if (
      !formData.board ||
      !formData.branch ||
      !formData.testName ||
      !formData.projectName
    ) {
      alert("모든 필드를 입력해주세요.");
      return;
    }

    try {
      const response = await fetch(" http://12.36.76.93:5174/api/run-test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        alert("테스트가 성공적으로 시작되었습니다!");
      } else {
        alert("테스트 시작에 실패했습니다.");
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      alert("네트워크 오류가 발생했습니다.");
    }
  };

  useEffect(() => {
    console.log(formData);
    console.log(formData.features);
  }, [formData]);

  return (
    <div>
      <PageMeta title="Qcom Test form" description="Qcom Test form" />
      <PageBreadcrumb pageTitle="Qcom Test Form" />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="space-y-6">
          <VersionSelectInputs
            onBoardChange={handleBoardChange}
            branch={formData.branch}
            onBranchChange={handleBranchChange}
          />
          <TesterDefaultInputs
            testName={formData.testName}
            onTestNameChange={handleTestNameChange}
            projectName={formData.projectName}
            onProjectNameChange={handleProjectNameChange}
          />
        </div>
        <div className="space-y-6">
          <FeatureCheckboxComponents
            selectedFeatures={formData.features}
            onChange={handleFeaturesChange}
          />
          <DetailTextAreaInput />
        </div>
      </div>
      <Button
        className="mt-6"
        size="full"
        variant="primary"
        startIcon={<FileIcon className="size-5" />}
        onClick={handleSubmit}
      >
        Run Test
      </Button>
    </div>
  );
}
