import React from 'react';
import { ExtractedData } from './types';

interface AnalysisFormProps {
  data: ExtractedData;
  onFieldChange: (field: keyof ExtractedData, value: any) => void;
  isReevaluating: boolean;
  onReevaluate: () => void;
}

const AnalysisForm: React.FC<AnalysisFormProps> = () => {
  return <div />;
};

export default AnalysisForm;
