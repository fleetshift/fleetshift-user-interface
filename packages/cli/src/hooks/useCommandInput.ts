import { useState, useRef, useMemo, useCallback } from "react";
import { useInput, useApp } from "ink";

interface DebugEntry {
  ts: number;
  event: string;
  data: Record<string, unknown>;
}

interface UseCommandInputOptions {
  suggestions: string[];
  onInputChange: (value: string) => void;
  onSubmit: (value: string) => void;
}

export function useCommandInput({
  suggestions,
  onInputChange,
  onSubmit,
}: UseCommandInputOptions) {
  const { exit } = useApp();
  const [inputKey, setInputKey] = useState(0);
  const [currentValue, setCurrentValue] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuIndex, setMenuIndex] = useState(0);
  const [exitPending, setExitPending] = useState(false);
  const exitTimer = useRef<ReturnType<typeof setTimeout>>();

  // Use a ref for defaultValue so it's synchronously available when
  // TextInput remounts — avoids React batching race conditions.
  const defaultValueRef = useRef("");

  // When Enter is pressed with the menu open, both our useInput handler
  // and TextInput's onSubmit fire. This ref tells handleSubmit to ignore
  // TextInput's redundant call when we already submitted from useInput.
  const skipNextSubmitRef = useRef(false);

  // --- Debug log ---
  const debugLogRef = useRef<DebugEntry[]>([]);
  const [debugTick, setDebugTick] = useState(0);
  const debugLog = useCallback(
    (event: string, data: Record<string, unknown>) => {
      const entry: DebugEntry = { ts: Date.now(), event, data };
      debugLogRef.current = [...debugLogRef.current.slice(-19), entry];
      setDebugTick((t) => t + 1);
    },
    [],
  );

  // Matching suggestions for the current input
  const matches = useMemo(() => {
    if (currentValue.length === 0) return [];
    return suggestions.filter((s) => s.startsWith(currentValue));
  }, [suggestions, currentValue]);

  /** Remount TextInput with a new value */
  const remountInput = (value: string) => {
    debugLog("remountInput", {
      value,
      prevDefault: defaultValueRef.current,
      prevKey: inputKey,
    });
    defaultValueRef.current = value;
    setCurrentValue(value);
    onInputChange(value);
    setInputKey((k) => k + 1);
  };

  /** Accept a completion value into the input */
  const acceptValue = (value: string) => {
    remountInput(value);
    setMenuOpen(false);
    setMenuIndex(0);
  };

  useInput((input, key) => {
    // --- Ctrl+C: double-tap exit ---
    if (input === "c" && key.ctrl) {
      if (exitPending) {
        exit();
        return;
      }
      setExitPending(true);
      clearTimeout(exitTimer.current);
      exitTimer.current = setTimeout(() => setExitPending(false), 2000);
      return;
    }
    if (exitPending) {
      setExitPending(false);
    }

    // --- Menu mode: arrow keys, accept, cancel ---
    if (menuOpen) {
      if (key.rightArrow || key.downArrow) {
        setMenuIndex((i) => Math.min(i + 1, matches.length - 1));
        return;
      }
      if (key.leftArrow || key.upArrow) {
        setMenuIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (key.tab) {
        const selected = matches[menuIndex];
        if (selected) acceptValue(selected);
        return;
      }
      if (key.return) {
        // Submit the selected menu item directly. TextInput's onSubmit
        // will also fire for this Enter keystroke, so set a flag to skip it.
        const selected = matches[menuIndex];
        if (selected) {
          debugLog("menuEnter:submit", { selected });
          skipNextSubmitRef.current = true;
          remountInput("");
          setMenuOpen(false);
          setMenuIndex(0);
          setTimeout(() => {
            debugLog("menuEnter:deferred", { selected });
            onSubmit(selected.trim());
          }, 0);
        }
        return;
      }
      if (key.escape) {
        setMenuOpen(false);
        setMenuIndex(0);
        return;
      }
      // Any other key closes menu (TextInput will handle the character)
      setMenuOpen(false);
      setMenuIndex(0);
      return;
    }

    // --- Tab completion (not in menu) ---
    if (key.tab && matches.length > 0) {
      if (matches.length === 1) {
        acceptValue(matches[0]!);
      } else {
        const common = commonPrefix(matches);
        if (common.length > currentValue.length) {
          acceptValue(common);
        }
        setMenuIndex(0);
        setMenuOpen(true);
      }
    }
  });

  const onChange = (value: string) => {
    debugLog("onChange", {
      value,
      prevValue: currentValue,
      defaultRef: defaultValueRef.current,
      inputKey,
    });
    setCurrentValue(value);
    onInputChange(value);
  };

  const handleSubmit = (value: string) => {
    if (skipNextSubmitRef.current) {
      debugLog("handleSubmit:skipped", { value });
      skipNextSubmitRef.current = false;
      remountInput("");
      return;
    }
    const trimmed = value.trim();
    debugLog("handleSubmit", {
      value,
      trimmed,
      currentValue,
      defaultRef: defaultValueRef.current,
      inputKey,
    });
    // Clear input and remount immediately, then defer the actual command
    // to the next tick so App's state updates don't get batched with the
    // input-clearing updates (which can cause a flash of the old value).
    remountInput("");
    setMenuOpen(false);
    setMenuIndex(0);
    if (trimmed) {
      setTimeout(() => {
        debugLog("onSubmit:deferred", { trimmed });
        onSubmit(trimmed);
      }, 0);
    }
  };

  return {
    inputKey,
    defaultValue: defaultValueRef.current,
    currentValue,
    suggestions,
    matches,
    menuOpen,
    menuIndex,
    exitPending,
    onChange,
    handleSubmit,
    // Debug
    debugEntries: debugLogRef.current,
    debugTick,
  };
}

function commonPrefix(strings: string[]): string {
  if (strings.length === 0) return "";
  let prefix = strings[0]!;
  for (let i = 1; i < strings.length; i++) {
    while (!strings[i]!.startsWith(prefix)) {
      prefix = prefix.slice(0, -1);
    }
  }
  return prefix;
}
