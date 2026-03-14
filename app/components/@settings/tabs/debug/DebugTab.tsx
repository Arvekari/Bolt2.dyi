import { memo } from 'react';
import { motion } from 'framer-motion';
import * as Tooltip from '@radix-ui/react-tooltip';
import { Switch } from '~/components/ui/Switch';
import { useSettings } from '~/lib/hooks/useSettings';
import { classNames } from '~/utils/classNames';
import { toast } from 'react-toastify';

interface DebugToggleCardProps {
  title: string;
  description: string;
  icon: string;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  helpText: string;
}

const HelpTooltip = ({ text }: { text: string }) => (
  <Tooltip.Provider delayDuration={100}>
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <button
          type="button"
          className={classNames(
            'inline-flex items-center justify-center w-5 h-5 rounded-full',
            'text-bolt-elements-textTertiary hover:text-bolt-elements-textPrimary',
            'border border-bolt-elements-borderColor hover:border-bolt-elements-borderColorActive',
            'transition-colors duration-150',
          )}
          aria-label="Toggle help"
        >
          <span className="i-ph:question text-xs" />
        </button>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          side="top"
          sideOffset={8}
          className="z-[260] max-w-xs rounded-md border border-bolt-elements-borderColor bg-bolt-elements-background-depth-2 px-3 py-2 text-xs text-bolt-elements-textPrimary shadow-lg"
        >
          {text}
          <Tooltip.Arrow style={{ fill: 'var(--bolt-elements-background-depth-2)' }} />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  </Tooltip.Provider>
);

const DebugToggleCard = memo(({ title, description, icon, enabled, onToggle, helpText }: DebugToggleCardProps) => {
  return (
    <motion.div
      className={classNames(
        'bg-bolt-elements-background-depth-2 hover:bg-bolt-elements-background-depth-3',
        'transition-colors duration-200 rounded-lg p-4',
      )}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 text-bolt-elements-textSecondary">
            <div className={classNames(icon, 'w-5 h-5')} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-medium text-bolt-elements-textPrimary">{title}</h4>
              <HelpTooltip text={helpText} />
            </div>
            <p className="mt-1 text-sm text-bolt-elements-textSecondary">{description}</p>
          </div>
        </div>
        <Switch checked={enabled} onCheckedChange={onToggle} />
      </div>
    </motion.div>
  );
});

export default function DebugTab() {
  const { debug, enableDebugMode, ollamaBridgedSystemPromptSplit, setOllamaBridgedSystemPromptSplit } = useSettings();

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-lg border border-bolt-elements-borderColor bg-bolt-elements-background-depth-1 p-4">
        <div className="flex items-center gap-2">
          <span className="i-ph:wrench text-purple-500" />
          <h3 className="text-sm font-semibold text-bolt-elements-textPrimary">Kehityksen aikaisia debug toimintoja</h3>
        </div>
        <p className="mt-2 text-sm text-bolt-elements-textSecondary">
          These toggles are intended for development diagnostics and controlled A/B behavior testing.
        </p>
      </div>

      <DebugToggleCard
        title="Show Chat Debug Button"
        description='Keep the "Show debug panel" button available during streaming so message-level diagnostics stay visible.'
        icon="i-ph:bug-droid"
        enabled={debug}
        onToggle={(enabled) => {
          enableDebugMode(enabled);
          toast.success(`Chat debug button ${enabled ? 'enabled' : 'disabled'}`);
        }}
        helpText='This is the existing permanent message-debug visibility switch. It controls whether the debug panel toggle appears in chat while a response is streaming.'
      />

      <DebugToggleCard
        title="Ollama Prompt Split A/B"
        description="Ollama-only A/B toggle: OFF uses automatic split when the model likely cannot handle the full system prompt as one message; ON forces one single bridged system message."
        icon="i-ph:git-branch"
        enabled={ollamaBridgedSystemPromptSplit}
        onToggle={(enabled) => {
          setOllamaBridgedSystemPromptSplit(enabled);
          toast.success(`Ollama A/B mode: ${enabled ? 'force single message' : 'automatic split when needed'}`);
        }}
        helpText='Only affects Ollama. ON forces the bridged system prompt to stay as one message. OFF allows automatic split when prompt length/model constraints suggest a single message may fail.'
      />
    </div>
  );
}
