import {
  makeStyles,
  mergeClasses,
  tokens,
} from '@fluentui/react-components';
import { CheckmarkRegular } from '@fluentui/react-icons';

export interface StepperStep {
  label: string;
  description?: string;
}

interface StepperProps {
  steps: StepperStep[];
  currentStep: number;
  onStepSelect?: (index: number) => void;
}

const useStyles = makeStyles({
  root: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: tokens.spacingHorizontalS,
    padding: `${tokens.spacingVerticalM} 0`,
    flexWrap: 'wrap',
  },
  step: {
    display: 'flex',
    flex: '1 1 0',
    minWidth: '8rem',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`,
    borderRadius: tokens.borderRadiusLarge,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground1,
    cursor: 'pointer',
    textAlign: 'left',
    fontFamily: 'inherit',
    transitionDuration: tokens.durationFast,
    transitionProperty: 'border-color, background-color, box-shadow, transform',
    ':disabled': {
      cursor: 'not-allowed',
      opacity: 0.55,
    },
  },
  stepActive: {
    border: `2px solid ${tokens.colorBrandStroke1}`,
    boxShadow: tokens.shadow4,
    backgroundColor: tokens.colorBrandBackground2,
  },
  stepDone: {
    border: `1px solid ${tokens.colorPaletteGreenBorder1}`,
    backgroundColor: tokens.colorPaletteGreenBackground1,
  },
  stepInteractive: {
    ':hover': {
      transform: 'translateY(-1px)',
      boxShadow: tokens.shadow4,
    },
  },
  circle: {
    width: '2rem',
    height: '2rem',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: tokens.borderRadiusCircular,
    backgroundColor: tokens.colorNeutralBackground3,
    color: tokens.colorNeutralForeground2,
    fontWeight: tokens.fontWeightSemibold,
    fontSize: tokens.fontSizeBase300,
  },
  circleActive: {
    backgroundColor: tokens.colorBrandBackground,
    color: tokens.colorNeutralForegroundOnBrand,
  },
  circleDone: {
    backgroundColor: tokens.colorPaletteGreenBackground3,
    color: tokens.colorPaletteGreenForeground2,
  },
  body: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    minWidth: 0,
  },
  label: {
    fontSize: tokens.fontSizeBase300,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
    lineHeight: 1.2,
  },
  desc: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
    lineHeight: 1.3,
  },
});

export function Stepper({ steps, currentStep, onStepSelect }: StepperProps) {
  const styles = useStyles();
  return (
    <nav className={styles.root} aria-label="Progress">
      {steps.map((step, index) => {
        const isActive = index === currentStep;
        const isDone = index < currentStep;
        const canSelect = onStepSelect && index <= currentStep;
        return (
          <button
            key={step.label}
            type="button"
            disabled={!canSelect}
            aria-current={isActive ? 'step' : undefined}
            onClick={canSelect ? () => onStepSelect?.(index) : undefined}
            className={mergeClasses(
              styles.step,
              canSelect && styles.stepInteractive,
              isActive && styles.stepActive,
              isDone && styles.stepDone,
            )}
          >
            <span
              className={mergeClasses(
                styles.circle,
                isActive && styles.circleActive,
                isDone && styles.circleDone,
              )}
              aria-hidden
            >
              {isDone ? <CheckmarkRegular fontSize={18} /> : index + 1}
            </span>
            <span className={styles.body}>
              <span className={styles.label}>{step.label}</span>
              {step.description ? <span className={styles.desc}>{step.description}</span> : null}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
