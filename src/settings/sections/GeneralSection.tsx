import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { usePreferencesStore } from "@/modules/settings/preferences";
import type { ThemePref } from "@/modules/settings/store";
import {
  EDITOR_THEME_LABELS,
  EDITOR_THEMES,
  TERMINAL_FONT_FAMILY_DEFAULT,
  TERMINAL_FONT_SIZES,
  TERMINAL_FONT_WEIGHTS,
  TERMINAL_SCROLLBACK_PRESETS,
  setAutostart,
  setEditorTheme,
  setRestoreWindowState,
  setShowHidden,
  setTerminalFontFamily,
  setTerminalFontSize,
  setTerminalFontWeight,
  setTerminalScrollback,
  setTerminalWebglEnabled,
  setVimMode,
  type EditorThemeId,
} from "@/modules/settings/store";
import { useTheme } from "@/modules/theme";
import {
  ArrowDown01Icon,
  ComputerIcon,
  Moon02Icon,
  Sun03Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { invoke } from "@tauri-apps/api/core";
import { disable, enable, isEnabled } from "@tauri-apps/plugin-autostart";
import { useEffect, useMemo, useState } from "react";
import { SectionHeader } from "../components/SectionHeader";
import { SettingRow } from "../components/SettingRow";

const APPEARANCE: {
  id: ThemePref;
  label: string;
  icon: typeof ComputerIcon;
}[] = [
  { id: "system", label: "System", icon: ComputerIcon },
  { id: "light", label: "Light", icon: Sun03Icon },
  { id: "dark", label: "Dark", icon: Moon02Icon },
];

export function GeneralSection() {
  const { theme, setTheme } = useTheme();
  const editorTheme = usePreferencesStore((s) => s.editorTheme);
  const autostart = usePreferencesStore((s) => s.autostart);
  const restoreWindowState = usePreferencesStore((s) => s.restoreWindowState);
  const vimMode = usePreferencesStore((s) => s.vimMode);
  const showHidden = usePreferencesStore((s) => s.showHidden);
  const terminalWebglEnabled = usePreferencesStore(
    (s) => s.terminalWebglEnabled,
  );
  const terminalFontFamily = usePreferencesStore((s) => s.terminalFontFamily);
  const terminalFontSize = usePreferencesStore((s) => s.terminalFontSize);
  const terminalFontWeight = usePreferencesStore((s) => s.terminalFontWeight);
  const terminalScrollback = usePreferencesStore((s) => s.terminalScrollback);

  const [systemFonts, setSystemFonts] = useState<string[]>([]);
  const [fontPickerOpen, setFontPickerOpen] = useState(false);
  const [fontSearch, setFontSearch] = useState("");

  useEffect(() => {
    let alive = true;
    invoke<string[]>("fonts_list_system")
      .then((list) => {
        if (alive) setSystemFonts(list);
      })
      .catch(() => {
        if (alive) setSystemFonts([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  const filteredFonts = useMemo(() => {
    const q = fontSearch.trim().toLowerCase();
    const base = q
      ? systemFonts.filter((f) => f.toLowerCase().includes(q))
      : systemFonts;
    return base.slice(0, 200);
  }, [systemFonts, fontSearch]);

  // Reconcile autostart pref with the actual OS state on mount — the user may
  // have toggled it from System Settings.
  useEffect(() => {
    let alive = true;
    void isEnabled()
      .then((on) => {
        if (!alive) return;
        if (on !== usePreferencesStore.getState().autostart) {
          void setAutostart(on);
        }
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  const onToggleAutostart = async (next: boolean) => {
    try {
      if (next) await enable();
      else await disable();
      await setAutostart(next);
    } catch (e) {
      console.error("autostart toggle failed", e);
    }
  };

  const onPickEditor = (id: EditorThemeId) => void setEditorTheme(id);

  const onToggleTerminalWebgl = (next: boolean) => {
    void setTerminalWebglEnabled(next).catch((e) =>
      console.error("terminal WebGL preference update failed", e),
    );
  };

  const onPickTerminalFontSize = (size: number) => void setTerminalFontSize(size);

  const onPickFontWeight = (weight: number) =>
    void setTerminalFontWeight(weight);

  const onPickFontFamily = (family: string) => {
    void setTerminalFontFamily(family);
    setFontPickerOpen(false);
    setFontSearch("");
  };

  const onPickScrollback = (lines: number) => void setTerminalScrollback(lines);

  const fontFamilyLabel =
    terminalFontFamily.trim() || `Auto (${TERMINAL_FONT_FAMILY_DEFAULT})`;

  const fontWeightLabel =
    TERMINAL_FONT_WEIGHTS.find((w) => w.value === terminalFontWeight)?.label ??
    `${terminalFontWeight}`;

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="General"
        description="Appearance, editor, and startup."
      />

      <div className="flex flex-col gap-2">
        <Label>Appearance</Label>
        <div className="grid grid-cols-3 gap-2">
          {APPEARANCE.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => setTheme(o.id)}
              className={cn(
                "group flex h-20 flex-col items-center justify-center gap-1.5 rounded-lg border bg-card transition-all",
                theme === o.id
                  ? "border-foreground/60 ring-1 ring-foreground/20"
                  : "border-border/60 hover:border-border",
              )}
            >
              <HugeiconsIcon icon={o.icon} size={18} strokeWidth={1.5} />
              <span className="text-[11.5px]">{o.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label>Editor theme</Label>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="h-9 justify-between gap-2 px-2.5 text-[12px]"
            >
              <span>{EDITOR_THEME_LABELS[editorTheme]}</span>
              <HugeiconsIcon
                icon={ArrowDown01Icon}
                size={12}
                strokeWidth={2}
                className="opacity-70"
              />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[220px]">
            {EDITOR_THEMES.map((t) => (
              <DropdownMenuItem
                key={t}
                onSelect={() => onPickEditor(t)}
                className={cn(
                  "text-[12px]",
                  t === editorTheme && "bg-accent/50",
                )}
              >
                {EDITOR_THEME_LABELS[t]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <SettingRow
          title="Vim mode"
          description="Enable Vim keybindings in the code editor."
        >
          <Switch
            checked={vimMode}
            onCheckedChange={(v) => void setVimMode(v)}
          />
        </SettingRow>
      </div>

      <div className="flex flex-col gap-2">
        <Label>Explorer</Label>
        <SettingRow
          title="Show hidden files"
          description="Include dot-prefixed files and folders (.env, .gitignore, .config) in the file explorer and search."
        >
          <Switch
            checked={showHidden}
            onCheckedChange={(v) => void setShowHidden(v)}
          />
        </SettingRow>
      </div>

      <div className="flex flex-col gap-2">
        <Label>Terminal</Label>
        <SettingRow
          title={
            <span className="inline-flex items-center gap-1.5">
              Use WebGL renderer
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span
                      className="cursor-help text-[11px] text-muted-foreground/70 leading-none"
                      aria-label="More info about WebGL renderer"
                    >
                      ⓘ
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[260px] text-[11px]">
                    xterm's WebGL renderer caches glyphs in a GPU texture atlas. On some macOS setups (especially with Nerd Fonts), the atlas corrupts and terminal text becomes unreadable. Turn this off as a fallback — performance dips slightly, but text renders correctly via the DOM renderer.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </span>
          }
          description="Hardware-accelerated rendering. Turn off if text shows corruption or blank tiles."
        >
          <Switch
            checked={terminalWebglEnabled}
            onCheckedChange={onToggleTerminalWebgl}
          />
        </SettingRow>
        <SettingRow
          title="Font family"
          description="Pick any monospace font installed on the system."
        >
          <Popover open={fontPickerOpen} onOpenChange={setFontPickerOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="h-8 w-[220px] justify-between gap-2 rounded-none px-2.5 text-[12px]"
              >
                <span className="truncate">{fontFamilyLabel}</span>
                <HugeiconsIcon
                  icon={ArrowDown01Icon}
                  size={12}
                  strokeWidth={2}
                  className="opacity-70"
                />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              className="w-[260px] rounded-none border border-border bg-popover p-0 shadow-none ring-0"
            >
              <Command>
                <CommandInput
                  placeholder="Search fonts..."
                  value={fontSearch}
                  onValueChange={setFontSearch}
                />
                <CommandList className="max-h-64 overflow-y-auto">
                  <CommandEmpty>
                    {systemFonts.length === 0
                      ? "Font enumeration unavailable on this platform."
                      : "No fonts found."}
                  </CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      value="__default__"
                      onSelect={() =>
                        onPickFontFamily(TERMINAL_FONT_FAMILY_DEFAULT)
                      }
                      className={cn(
                        "text-[12px]",
                        terminalFontFamily === TERMINAL_FONT_FAMILY_DEFAULT &&
                          "bg-accent/50",
                      )}
                    >
                      Default ({TERMINAL_FONT_FAMILY_DEFAULT})
                    </CommandItem>
                    {filteredFonts.map((font) => (
                      <CommandItem
                        key={font}
                        value={font}
                        onSelect={() => onPickFontFamily(font)}
                        className={cn(
                          "text-[12px]",
                          font === terminalFontFamily && "bg-accent/50",
                        )}
                        style={{ fontFamily: `"${font}"` }}
                      >
                        {font}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </SettingRow>
        <SettingRow
          title="Font size"
          description="Terminal text size."
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="h-8 justify-between gap-2 rounded-none px-2.5 text-[12px]"
              >
                <span>{terminalFontSize} px</span>
                <HugeiconsIcon
                  icon={ArrowDown01Icon}
                  size={12}
                  strokeWidth={2}
                  className="opacity-70"
                />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="min-w-[80px] rounded-none border border-border bg-popover p-0 shadow-none ring-0"
            >
              {TERMINAL_FONT_SIZES.map((size) => (
                <DropdownMenuItem
                  key={size}
                  onSelect={() => onPickTerminalFontSize(size)}
                  className={cn(
                    "rounded-none px-3 py-1.5 text-[12px]",
                    size === terminalFontSize && "bg-accent/50",
                  )}
                >
                  {size} px
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </SettingRow>
        <SettingRow
          title="Font weight"
          description="Pick a heavier weight if glyphs look too thin compared to your usual terminal."
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="h-8 w-[180px] justify-between gap-2 rounded-none px-2.5 text-[12px]"
              >
                <span className="truncate">{fontWeightLabel}</span>
                <HugeiconsIcon
                  icon={ArrowDown01Icon}
                  size={12}
                  strokeWidth={2}
                  className="opacity-70"
                />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="min-w-[180px] rounded-none border border-border bg-popover p-0 shadow-none ring-0"
            >
              {TERMINAL_FONT_WEIGHTS.map((w) => (
                <DropdownMenuItem
                  key={w.value}
                  onSelect={() => onPickFontWeight(w.value)}
                  className={cn(
                    "rounded-none px-3 py-1.5 text-[12px]",
                    w.value === terminalFontWeight && "bg-accent/50",
                  )}
                  style={{ fontWeight: w.value }}
                >
                  {w.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </SettingRow>
        <SettingRow
          title="Scrollback"
          description="Lines of history kept per terminal. Higher uses more RAM (~3 KB / line)."
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="h-8 justify-between gap-2 rounded-none px-2.5 text-[12px]"
              >
                <span>{terminalScrollback.toLocaleString()} lines</span>
                <HugeiconsIcon
                  icon={ArrowDown01Icon}
                  size={12}
                  strokeWidth={2}
                  className="opacity-70"
                />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="min-w-[140px] rounded-none border border-border bg-popover p-0 shadow-none ring-0"
            >
              {TERMINAL_SCROLLBACK_PRESETS.map((lines) => (
                <DropdownMenuItem
                  key={lines}
                  onSelect={() => onPickScrollback(lines)}
                  className={cn(
                    "rounded-none px-3 py-1.5 text-[12px]",
                    lines === terminalScrollback && "bg-accent/50",
                  )}
                >
                  {lines.toLocaleString()} lines
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </SettingRow>
      </div>

      <div className="flex flex-col gap-2">
        <Label>Startup</Label>
        <div className="flex flex-col gap-2">
          <SettingRow
            title="Launch at login"
            description="Open Terax automatically when you sign in."
          >
            <Switch
              checked={autostart}
              onCheckedChange={(v) => void onToggleAutostart(v)}
            />
          </SettingRow>
          <SettingRow
            title="Restore window position & size"
            description="Reopen the main window where you left it. Applies on next launch."
          >
            <Switch
              checked={restoreWindowState}
              onCheckedChange={(v) => void setRestoreWindowState(v)}
            />
          </SettingRow>
        </div>
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[11px] font-medium tracking-tight text-muted-foreground">
      {children}
    </span>
  );
}
