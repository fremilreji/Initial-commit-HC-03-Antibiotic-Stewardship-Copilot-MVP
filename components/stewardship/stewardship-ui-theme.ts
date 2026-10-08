/**
 * Stewardship Desk UI Theme & Presentation Config
 * Author: Shivani (@20babushivani-wq)
 * Project: HC-03 Antibiotic Stewardship Copilot
 */

export const STEWARDSHIP_THEME = {
  name: 'Hospital Stewardship Dark Mode',
  triageColors: {
    urgent: '#ef4444',
    watch: '#f59e0b',
    access: '#10b981',
    reserve: '#8b5cf6',
  },
  hotkeys: {
    approveSuggestion: '1 / A',
    sendToPrescriber: '2 / S',
    approveAsWritten: '3 / W',
    verifyExtraction: 'V',
    undoDecision: 'Z / U',
  },
  animations: {
    buttonScale: 'active:scale-95 transition-transform duration-100',
    fadeIn: 'animate-in fade-in-50 duration-200',
  },
} as const
