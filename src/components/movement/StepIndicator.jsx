import React from 'react';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

export default function StepIndicator({ steps, currentStep }) {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      {steps.map((label, i) => (
        <React.Fragment key={i}>
          <div className="flex items-center gap-1.5">
            <div className={cn(
              "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold transition-colors",
              i < currentStep 
                ? "bg-primary text-primary-foreground" 
                : i === currentStep 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-muted text-muted-foreground"
            )}>
              {i < currentStep ? <Check className="h-3 w-3" /> : i + 1}
            </div>
            <span className={cn(
              "text-[10px] hidden sm:inline",
              i <= currentStep ? "text-foreground font-medium" : "text-muted-foreground"
            )}>{label}</span>
          </div>
          {i < steps.length - 1 && (
            <div className={cn(
              "flex-1 h-0.5 rounded-full",
              i < currentStep ? "bg-primary" : "bg-muted"
            )} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}