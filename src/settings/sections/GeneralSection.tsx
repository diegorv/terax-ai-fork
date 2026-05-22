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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
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
  EDITOR_FONT_FAMILY_DEFAULT,
  EDITOR_FONT_SIZES,
  EDITOR_FONT_WEIGHTS,
  TERMINAL_FONT_FAMILY_DEFAULT,
  TERMINAL_FONT_SIZES,
  TERMINAL_FONT_WEIGHTS,
  TERMINAL_SCROLLBACK_PRESETS,
  setAutostart,
  setEditorFontFamily,
  setEditorFontSize,
  setEditorFontWeight,
  setRestoreWindowState,
  setShowHidden,
  setTerminalFontFamily,
  setTerminalFontSize,
  setTerminalFontWeight,
  setTerminalLetterSpacing,
  setTerminalScrollback,
  setTerminalWebglEnabled,
  setVimMode,
  setZoomLevel,
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

const LETTER_SPACINGS = [-4, -3, -2, -1, 0, 1, 2, 3, 4] as const;
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2.0;
const ZOOM_STEP = 0.05;

export function GeneralSection() {
  const { mode, setMode } = useTheme();

  const autostart = usePreferencesStore((s) => s.autostart);
  const restoreWindowState = usePreferencesStore((s) => s.restoreWindowState);
  const vimMode = usePreferencesStore((s) => s.vimMode);
  const showHidden = usePreferencesStore((s) => s.showHidden);
  const terminalWebglEnabled = usePreferencesStore(
    (s) => s.terminalWebglEnabled,
  );
  const terminalFontFamily = usePreferencesStore((s) => s.terminalFontFamily);
  const terminalLetterSpacing = usePreferencesStore(
    (s) => s.terminalLetterSpacing,
  );
  const terminalFontSize = usePreferencesStore((s) => s.terminalFontSize);
  const terminalFontWeight = usePreferencesStore((s) => s.terminalFontWeight);
  const terminalScrollback = usePreferencesStore((s) => s.terminalScrollback);
  const editorFontFamily = usePreferencesStore((s) => s.editorFontFamily);
  const editorFontSize = usePreferencesStore((s) => s.editorFontSize);
  const editorFontWeight = usePreferencesStore((s) => s.editorFontWeight);
  const zoomLevel = usePreferencesStore((s) => s.zoomLevel);

  const [systemFonts, setSystemFonts] = useState<string[]>([]);
  const [fontPickerOpen, setFontPickerOpen] = useState(false);
  const [fontSearch, setFontSearch] = useState("");
  const [editorFontPickerOpen, setEditorFontPickerOpen] = useState(false);
  const [editorFontSearch, setEditorFontSearch] = useState("");

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

  const filteredEditorFonts = useMemo(() => {
    const q = editorFontSearch.trim().toLowerCase();
    const base = q
      ? systemFonts.filter((f) => f.toLowerCase().includes(q))
      : systemFonts;
    return base.slice(0, 200);
  }, [systemFonts, editorFontSearch]);

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

  const onPickTerminalFontSize = (size: number) => void setTerminalFontSize(size);

  const onPickFontWeight = (weight: number) =>
    void setTerminalFontWeight(weight);

  const onPickFontFamily = (family: string) => {
    void setTerminalFontFamily(family);
    setFontPickerOpen(false);
    setFontSearch("");
  };

  const onPickEditorFontFamily = (family: string) => {
    void setEditorFontFamily(family);
    setEditorFontPickerOpen(false);
    setEditorFontSearch("");
  };

  const onPickEditorFontSize = (size: number) => void setEditorFontSize(size);

  const onPickEditorFontWeight = (weight: number) =>
    void setEditorFontWeight(weight);

  const fontFamilyLabel =
    terminalFontFamily.trim() || `Auto (${TERMINAL_FONT_FAMILY_DEFAULT})`;

  const fontWeightLabel =
    TERMINAL_FONT_WEIGHTS.find((w) => w.value === terminalFontWeight)?.label ??
    `${terminalFontWeight}`;

  const editorFontFamilyLabel =
    editorFontFamily.trim() || `Auto (${EDITOR_FONT_FAMILY_DEFAULT})`;

  const editorFontWeightLabel =
    EDITOR_FONT_WEIGHTS.find((w) => w.value === editorFontWeight)?.label ??
    `${editorFontWeight}`;

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="General"
        description="Mode, editor, and startup."
      />

      <div className="flex flex-col gap-2">
        <Label>Appearance</Label>
        <div className="grid grid-cols-3 gap-2">
          {APPEARANCE.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => setMode(o.id)}
              className={cn(
                "group flex h-20 flex-col items-center justify-center gap-1.5 rounded-lg border bg-card transition-all",
                mode === o.id
                  ? "border-foreground/60 ring-1 ring-foreground/20"
                  : "border-border/60 hover:border-border",
              )}
            >
              <HugeiconsIcon icon={o.icon} size={18} strokeWidth={1.5} />
              <span className="text-[11.5px]">{o.label}</span>
            </button>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground">
          For theme, background and customization, see the{" "}
          <strong className="font-medium text-foreground">Themes</strong> tab.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Label>Zoom</Label>
        <div className="flex flex-col gap-3 rounded-lg border border-border/60 p-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11.5px] text-muted-foreground">
              UI zoom level
            </span>
            <span className="tabular-nums text-[11px] text-muted-foreground">
              {Math.round(zoomLevel * 100)}%
            </span>
          </div>
          <Slider
            value={[zoomLevel]}
            min={ZOOM_MIN}
            max={ZOOM_MAX}
            step={ZOOM_STEP}
            onValueChange={(v) => void setZoomLevel(v[0] ?? 1)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label>Editor</Label>
        <SettingRow
          title="Vim mode"
          description="Enable Vim keybindings in the code editor."
        >
          <Switch
            checked={vimMode}
            onCheckedChange={(v) => void setVimMode(v)}
          />
        </SettingRow>
        <SettingRow
          title="Font family"
          description="Pick any monospace font installed on the system."
        >
          <Popover
            open={editorFontPickerOpen}
            onOpenChange={setEditorFontPickerOpen}
          >
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="h-8 w-[220px] justify-between gap-2 rounded-none px-2.5 text-[12px]"
              >
                <span className="truncate">{editorFontFamilyLabel}</span>
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
                  value={editorFontSearch}
                  onValueChange={setEditorFontSearch}
                />
                <CommandList className="max-h-64 overflow-y-auto">
                  <CommandEmpty>
                    {systemFonts.length === 0
                      ? "Font enumeration unavailable on this platform."
                      : "No fonts found."}
                  </CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      value="__editor_default__"
                      onSelect={() =>
                        onPickEditorFontFamily(EDITOR_FONT_FAMILY_DEFAULT)
                      }
                      className={cn(
                        "text-[12px]",
                        editorFontFamily === EDITOR_FONT_FAMILY_DEFAULT &&
                          "bg-accent/50",
                      )}
                    >
                      Default ({EDITOR_FONT_FAMILY_DEFAULT})
                    </CommandItem>
                    {filteredEditorFonts.map((font) => (
                      <CommandItem
                        key={font}
                        value={font}
                        onSelect={() => onPickEditorFontFamily(font)}
                        className={cn(
                          "text-[12px]",
                          font === editorFontFamily && "bg-accent/50",
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
        <SettingRow title="Font size" description="Editor text size.">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="h-8 justify-between gap-2 rounded-none px-2.5 text-[12px]"
              >
                <span>{editorFontSize} px</span>
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
              {EDITOR_FONT_SIZES.map((size) => (
                <DropdownMenuItem
                  key={size}
                  onSelect={() => onPickEditorFontSize(size)}
                  className={cn(
                    "rounded-none px-3 py-1.5 text-[12px]",
                    size === editorFontSize && "bg-accent/50",
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
          description="Pick a heavier weight if editor text looks too thin."
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="h-8 w-[180px] justify-between gap-2 rounded-none px-2.5 text-[12px]"
              >
                <span className="truncate">{editorFontWeightLabel}</span>
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
              {EDITOR_FONT_WEIGHTS.map((w) => (
                <DropdownMenuItem
                  key={w.value}
                  onSelect={() => onPickEditorFontWeight(w.value)}
                  className={cn(
                    "rounded-none px-3 py-1.5 text-[12px]",
                    w.value === editorFontWeight && "bg-accent/50",
                  )}
                  style={{ fontWeight: w.value }}
                >
                  {w.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
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
                  <TooltipContent
                    side="top"
                    className="max-w-65 text-[11px]"
                  >
                    xterm's WebGL renderer caches glyphs in a GPU texture
                    atlas. On some macOS setups (especially with Nerd Fonts),
                    the atlas corrupts and terminal text becomes unreadable.
                    Turn this off as a fallback — performance dips slightly,
                    but text renders correctly via the DOM renderer.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </span>
          }
          description="Hardware-accelerated rendering. Turn off if text shows corruption or blank tiles."
        >
          <Switch
            checked={terminalWebglEnabled}
            onCheckedChange={(v) => void setTerminalWebglEnabled(v)}
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
          title="Letter spacing"
          description="Extra horizontal space between characters (px). Use negative values to tighten Nerd Fonts."
        >
          <Select
            value={String(terminalLetterSpacing)}
            onValueChange={(v) => void setTerminalLetterSpacing(Number(v))}
          >
            <SelectTrigger size="sm" className="h-8 w-28 text-[12px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LETTER_SPACINGS.map((v) => (
                <SelectItem key={v} value={String(v)} className="text-[12px]">
                  {v > 0 ? `+${v}` : v} px
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingRow>
        <SettingRow title="Font size" description="Terminal text size.">
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
          <Select
            value={String(terminalScrollback)}
            onValueChange={(v) => void setTerminalScrollback(Number(v))}
          >
            <SelectTrigger size="sm" className="h-8 w-36 text-[12px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TERMINAL_SCROLLBACK_PRESETS.map((lines) => (
                <SelectItem
                  key={lines}
                  value={String(lines)}
                  className="text-[12px]"
                >
                  {lines.toLocaleString()} lines
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
