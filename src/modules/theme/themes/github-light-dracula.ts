import type { Theme } from "../types";

const DRACULA_ANSI = [
  "#000000", "#ff5555", "#50fa7b", "#f1fa8c",
  "#bd93f9", "#ff79c6", "#8be9fd", "#bbbbbb",
  "#555555", "#ff5555", "#50fa7b", "#f1fa8c",
  "#bd93f9", "#ff79c6", "#8be9fd", "#ffffff",
] as const;

const DRACULA_TERMINAL = {
  background: "#1e1f29",
  foreground: "#e6e6e6",
  cursor: "#bbbbbb",
  cursorAccent: "#ffffff",
  selection: "#44475a",
  ansi: DRACULA_ANSI,
} as const;

export const githubLightDracula: Theme = {
  id: "github-light-dracula",
  name: "GitHub Light + Dracula",
  description: "GitHub Light chrome with Dracula iTerm2 palette on the terminal pane.",
  variants: {
    light: {
      colors: {
        background: "#ffffff",
        foreground: "#1f2328",
        card: "#f6f8fa",
        cardForeground: "#1f2328",
        popover: "#ffffff",
        popoverForeground: "#1f2328",
        primary: "#0969da",
        primaryForeground: "#ffffff",
        muted: "#f6f8fa",
        mutedForeground: "#59636e",
        accent: "#ddf4ff",
        accentForeground: "#0969da",
        border: "#d1d9e0",
        input: "#d1d9e0",
        ring: "#0969da",
        sidebar: "#f6f8fa",
        sidebarForeground: "#1f2328",
        sidebarPrimary: "#0969da",
        sidebarAccent: "#ddf4ff",
        sidebarBorder: "#d1d9e0",
        sidebarRing: "#0969da",
      },
      terminal: DRACULA_TERMINAL,
    },
    dark: {
      colors: {
        background: "#0d1117",
        foreground: "#e6edf3",
        card: "#161b22",
        cardForeground: "#e6edf3",
        popover: "#161b22",
        popoverForeground: "#e6edf3",
        primary: "#2f81f7",
        primaryForeground: "#0d1117",
        muted: "#161b22",
        mutedForeground: "#7d8590",
        accent: "#388bfd1a",
        accentForeground: "#2f81f7",
        border: "#30363d",
        input: "#30363d",
        ring: "#2f81f7",
        sidebar: "#0d1117",
        sidebarForeground: "#e6edf3",
        sidebarPrimary: "#2f81f7",
        sidebarAccent: "#161b22",
        sidebarBorder: "#30363d",
        sidebarRing: "#2f81f7",
      },
      terminal: DRACULA_TERMINAL,
    },
  },
};
