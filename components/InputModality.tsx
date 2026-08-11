'use client';

import { useEffect } from 'react';

/**
 * Tracks the visitor's most recent input device as
 * `data-input-modality="keyboard" | "mouse"` on `<html>`.
 *
 * Exists to fix one specific case native `:focus-visible` gets wrong: Base UI's
 * Menu returns DOM focus to its trigger button after closing (correct, and
 * required for keyboard users) via a raw `element.focus()` call with no
 * modality hint. The browser can't always tell that call apart from a
 * keyboard interaction, so picking a filter with a mouse click can leave the
 * trigger showing a keyboard focus ring afterwards — see the `globals.css`
 * rule this attribute gates.
 */
export function InputModality() {
  useEffect(() => {
    const setKeyboard = () => document.documentElement.setAttribute('data-input-modality', 'keyboard');
    const setPointer = () => document.documentElement.setAttribute('data-input-modality', 'mouse');
    document.addEventListener('keydown', setKeyboard, true);
    document.addEventListener('pointerdown', setPointer, true);
    return () => {
      document.removeEventListener('keydown', setKeyboard, true);
      document.removeEventListener('pointerdown', setPointer, true);
    };
  }, []);

  return null;
}
