import { createSignal, createMemo, Show } from 'solid-js';
import { usePlayback } from '../hooks/useDac';
import { Play, Pause, SkipBack, SkipForward, RotateCcw, Repeat, ChevronRight, ChevronLeft } from 'lucide-solid';

export interface DacPlaybackControlsProps {
  class?: string;
  style?: Record<string, any>;
  compact?: boolean;
  defaultExpanded?: boolean;
}

export function DacPlaybackControls(props: DacPlaybackControlsProps) {
  const {
    step,
    isPlaying,
    speed,
    setSpeed,
    isLooping,
    setIsLooping,
    totalSteps,
    currentElement,
    play,
    pause,
    togglePlay,
    reset,
    stepForward,
    stepBackward,
    seekTo,
  } = usePlayback();

  const [isExpanded, setIsExpanded] = createSignal(props.defaultExpanded ?? false);

  // If no geometries exist, don't show controls
  const total = createMemo(() => totalSteps());

  const currentDisplayStep = createMemo(() => {
    const s = step();
    return s === null ? total() : s;
  });

  const elementName = createMemo(() => {
    const el = currentElement();
    if (!el) return '';
    return el.componentId || el.type || 'element';
  });

  const cycleSpeed = () => {
    const current = speed();
    if (current <= 0.5) setSpeed(1);
    else if (current <= 1) setSpeed(2);
    else setSpeed(0.5);
  };

  const buttonStyle = {
    background: 'transparent',
    border: 'none',
    color: 'var(--app-text, #cbd5e1)',
    width: '28px',
    height: '28px',
    cursor: 'pointer',
    "border-radius": '6px',
    display: 'flex',
    "align-items": 'center',
    "justify-content": 'center',
    "flex-shrink": 0,
    transition: 'background 0.15s, color 0.15s',
  };

  const activeButtonStyle = {
    ...buttonStyle,
    background: 'var(--app-btn-bg, #3b82f6)',
    color: 'var(--app-btn-text, #ffffff)',
  };

  return (
    <Show when={total() > 0}>
      <div
        class={props.class}
        style={{
          "pointer-events": 'auto',
          display: 'flex',
          "align-items": 'center',
          gap: '5px',
          padding: '4px 8px',
          "background-color": 'var(--app-bg-panel, #1e293b)',
          "backdrop-filter": 'var(--app-backdrop, blur(8px))',
          border: '1px solid var(--app-border, #334155)',
          "border-radius": '12px',
          "box-shadow": '0 4px 14px rgba(0,0,0,0.12)',
          color: 'var(--app-text, #f8fafc)',
          "user-select": 'none',
          transition: 'all 0.2s ease',
          ...props.style,
        }}
        data-playback-controls="true"
        data-expanded={isExpanded()}
      >
        {/* Play / Pause Primary Button */}
        <button
          style={isPlaying() ? activeButtonStyle : { ...buttonStyle, background: 'rgba(255,255,255,0.06)' }}
          onClick={togglePlay}
          title={isPlaying() ? 'Pause sequence' : 'Play construction sequence'}
        >
          {isPlaying() ? <Pause size={15} /> : <Play size={15} />}
        </button>

        {/* --- COLLAPSED VIEW --- */}
        <Show when={!isExpanded()}>
          {/* Expand Button (>) */}
          <button
            style={{
              ...buttonStyle,
              "border-left": '1px solid var(--app-border, #334155)',
              "border-radius": '0 6px 6px 0',
              "margin-left": '2px',
            }}
            onClick={() => setIsExpanded(true)}
            title="Expand playback controls"
          >
            <ChevronRight size={15} />
          </button>
        </Show>

        {/* --- EXPANDED VIEW --- */}
        <Show when={isExpanded()}>
          {/* Step Backward */}
          <button
            style={buttonStyle}
            onClick={stepBackward}
            title="Step backward"
            disabled={currentDisplayStep() <= 0}
          >
            <SkipBack size={14} />
          </button>

          {/* Step Forward */}
          <button
            style={buttonStyle}
            onClick={stepForward}
            title="Step forward"
            disabled={currentDisplayStep() >= total()}
          >
            <SkipForward size={14} />
          </button>

          {/* Scrubber Timeline Slider */}
          <div style={{ display: 'flex', "align-items": 'center', gap: '6px', "margin": '0 4px' }}>
            <input
              type="range"
              min="0"
              max={total()}
              value={currentDisplayStep()}
              onInput={(e) => seekTo(Number(e.currentTarget.value))}
              style={{
                width: '84px',
                height: '4px',
                cursor: 'pointer',
                "accent-color": 'var(--app-btn-bg, #3b82f6)',
              }}
              title={`Step ${currentDisplayStep()} of ${total()}`}
            />

            {/* Step Counter (Fixed width to prevent shift across digits) */}
            <span
              style={{
                "font-size": '11px',
                "font-family": 'monospace',
                color: 'var(--app-text-muted, #94a3b8)',
                width: '42px',
                "text-align": 'center',
                "flex-shrink": 0,
              }}
            >
              {currentDisplayStep()}/{total()}
            </span>
          </div>

          {/* Current Element Badge (Fixed width slot to eliminate layout shift) */}
          <div
            style={{
              width: '100px',
              height: '24px',
              display: 'flex',
              "align-items": 'center',
              "justify-content": 'center',
              padding: '0 6px',
              "border-radius": '4px',
              background: elementName() ? 'rgba(245, 158, 11, 0.12)' : 'rgba(255, 255, 255, 0.03)',
              border: elementName() ? '1px solid rgba(245, 158, 11, 0.25)' : '1px solid var(--app-border, #334155)',
              "box-sizing": 'border-box',
              overflow: 'hidden',
              "flex-shrink": 0,
            }}
            title={elementName() || 'No active element'}
          >
            <span
              style={{
                "font-size": '10px',
                "font-family": 'monospace',
                color: elementName() ? 'var(--app-accent, #f59e0b)' : 'var(--app-text-muted, #64748b)',
                "white-space": 'nowrap',
                overflow: 'hidden',
                "text-overflow": 'ellipsis',
                "text-align": 'center',
                width: '100%',
              }}
            >
              {elementName() || '—'}
            </span>
          </div>

          {/* Speed Selector (Fixed width to prevent shift when toggling between 1x and 0.5x) */}
          <button
            style={{
              ...buttonStyle,
              width: '32px',
              padding: '0 2px',
              "font-size": '11px',
              "font-family": 'monospace',
              "font-weight": 'bold',
              "text-align": 'center',
            }}
            onClick={cycleSpeed}
            title="Playback speed (click to toggle)"
          >
            {speed()}x
          </button>

          {/* Loop Toggle */}
          <button
            style={isLooping() ? activeButtonStyle : buttonStyle}
            onClick={() => setIsLooping(!isLooping())}
            title={isLooping() ? 'Looping enabled' : 'Enable loop'}
          >
            <Repeat size={13} />
          </button>

          {/* Reset / Show All Button */}
          <Show when={step() !== null}>
            <button
              style={buttonStyle}
              onClick={reset}
              title="Reset to full view"
            >
              <RotateCcw size={13} />
            </button>
          </Show>

          {/* Collapse Button (<) */}
          <button
            style={{ ...buttonStyle, "border-left": '1px solid var(--app-border, #334155)', "border-radius": '0 6px 6px 0', "margin-left": '2px' }}
            onClick={() => setIsExpanded(false)}
            title="Collapse playback controls"
          >
            <ChevronLeft size={15} />
          </button>
        </Show>
      </div>
    </Show>
  );
}
