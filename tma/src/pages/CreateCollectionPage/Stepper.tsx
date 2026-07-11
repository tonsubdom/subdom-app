import React, { ReactNode, useState } from 'react';
import { 
  Button
} from "@telegram-apps/telegram-ui";

interface StepperProps {
  current: number;
  children: ReactNode[];
  devMode?: boolean;  // Новый проп для режима разработки
}

const Stepper: React.FC<StepperProps> = ({ 
  current, 
  children, 
  devMode = false  // По умолчанию выключен
}) => {
  const [localCurrent, setLocalCurrent] = useState(current);

  // Если включен devMode, показываем все шаги
  const stepsToRender = devMode 
    ? children 
    : [children[localCurrent]];

  return (
    <div>
      {stepsToRender.map((stepContent, index) => (
        <div 
          key={index} 
          style={{ 
            display: devMode ? 'block' : 'contents',
            border: devMode ? '1px solid #e0e0e0' : 'none',
            padding: devMode ? '10px' : '0',
            marginBottom: devMode ? '10px' : '0'
          }}
        >
          {devMode && <h3>Step {index}</h3>}
          {stepContent}
        </div>
      ))}
      
      {!devMode && (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          marginTop: '10px' 
        }}>
          {localCurrent > 0 && (
            <Button 
              onClick={() => setLocalCurrent(prev => Math.max(0, prev - 1))}
            >
              Previous
            </Button>
          )}
          {localCurrent < children.length - 1 && (
            <Button 
              onClick={() => setLocalCurrent(prev => Math.min(children.length - 1, prev + 1))}
            >
              Next
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default Stepper;
