import { useState, useRef, useMemo } from "react";
import { useInput, useApp } from "ink";

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

  // Command history (up/down arrow)
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef(-1);
  // Stash the in-progress input when navigating history
  const historyStashRef = useRef("");

  // Matching suggestions for the current input
  const matches = useMemo(() => {
    if (currentValue.length === 0) return [];
    return suggestions.filter((s) => s.startsWith(currentValue));
  }, [suggestions, currentValue]);

  /** Remount TextInput with a new value */
  const remountInput = (value: string) => {
    defaultValueRef.current = value;
    setCurrentValue(value);
    onInputChange(value);
    setInputKey((k) => k + 1);
  };

  /** Push a command to history (most recent first, max 100) */
  const pushHistory = (cmd: string) => {
    // Avoid duplicating the last entry
    if (historyRef.current[0] !== cmd) {
      historyRef.current = [cmd, ...historyRef.current].slice(0, 100);
    }
    historyIndexRef.current = -1;
    historyStashRef.current = "";
  };

  /** Accept a completion value into the input */
  const acceptValue = (value: string) => {
    remountInput(value);
    setMenuOpen(false);
    setMenuIndex(0);
  };

  useInput((input, key) => {
    // --- Ctrl+C: clear input + warn on first press, exit on second ---
    if (input === "c" && key.ctrl) {
      if (exitPending) {
        exit();
        return;
      }
      if (currentValue.length > 0) {
        remountInput("");
        setMenuOpen(false);
        setMenuIndex(0);
      }
      setExitPending(true);
      clearTimeout(exitTimer.current);
      exitTimer.current = setTimeout(() => setExitPending(false), 2000);
      return;
    }
    if (exitPending) {
      setExitPending(false);
    }

    // --- Escape: close menu or clear input ---
    if (key.escape) {
      if (menuOpen) {
        setMenuOpen(false);
        setMenuIndex(0);
      } else if (currentValue.length > 0) {
        remountInput("");
      }
      return;
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
          const trimmed = selected.trim();
          skipNextSubmitRef.current = true;
          pushHistory(trimmed);
          remountInput("");
          setMenuOpen(false);
          setMenuIndex(0);
          setTimeout(() => {
            onSubmit(trimmed);
          }, 0);
        }
        return;
      }
      // Any other key closes menu (TextInput will handle the character)
      setMenuOpen(false);
      setMenuIndex(0);
      return;
    }

    // --- History navigation (not in menu) ---
    if (key.upArrow && historyRef.current.length > 0) {
      if (historyIndexRef.current === -1) {
        historyStashRef.current = currentValue;
      }
      const nextIndex = Math.min(
        historyIndexRef.current + 1,
        historyRef.current.length - 1,
      );
      historyIndexRef.current = nextIndex;
      remountInput(historyRef.current[nextIndex]!);
      return;
    }
    if (key.downArrow && historyIndexRef.current >= 0) {
      const nextIndex = historyIndexRef.current - 1;
      historyIndexRef.current = nextIndex;
      if (nextIndex < 0) {
        remountInput(historyStashRef.current);
      } else {
        remountInput(historyRef.current[nextIndex]!);
      }
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
    setCurrentValue(value);
    onInputChange(value);
  };

  const handleSubmit = (value: string) => {
    if (skipNextSubmitRef.current) {
      skipNextSubmitRef.current = false;
      remountInput("");
      return;
    }
    const trimmed = value.trim();
    // Clear input and remount immediately, then defer the actual command
    // to the next tick so App's state updates don't get batched with the
    // input-clearing updates (which can cause a flash of the old value).
    remountInput("");
    setMenuOpen(false);
    setMenuIndex(0);
    if (trimmed) {
      pushHistory(trimmed);
      setTimeout(() => {
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
