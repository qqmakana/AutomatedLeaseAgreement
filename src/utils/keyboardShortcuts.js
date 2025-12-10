// Keyboard shortcuts utility
// Usage: useKeyboardShortcuts({ 'Ctrl+S': handleSave, 'Ctrl+N': handleNew })

export const useKeyboardShortcuts = (shortcuts) => {
  React.useEffect(() => {
    const handleKeyDown = (event) => {
      const key = event.key;
      const ctrl = event.ctrlKey || event.metaKey;
      const shift = event.shiftKey;
      const alt = event.altKey;

      // Build shortcut string
      let shortcut = '';
      if (ctrl) shortcut += 'Ctrl+';
      if (alt) shortcut += 'Alt+';
      if (shift) shortcut += 'Shift+';
      shortcut += key;

      // Check if shortcut exists
      if (shortcuts[shortcut]) {
        event.preventDefault();
        shortcuts[shortcut]();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
};

// Helper to format shortcut for display
export const formatShortcut = (shortcut) => {
  return shortcut
    .replace('Ctrl', '⌘')
    .replace('Alt', '⌥')
    .replace('Shift', '⇧');
};







