//! Claude Code sidecar.
//!
//! Spawns the local `claude` CLI per turn using its stream-json IPC mode so
//! that conversations consume the user's Claude subscription (Pro / Max)
//! instead of API credits. Each `claude_code_send` invocation is one turn:
//!
//!   claude -p --input-format stream-json --output-format stream-json \
//!          --include-partial-messages --verbose --model <m> [--resume <sid>]
//!
//! The user-message JSON is piped to stdin; the stdout stream-json lines are
//! forwarded line-by-line to the webview via a Tauri Channel. The JS side is
//! responsible for capturing the session id from the first `system` init
//! event and passing it back on subsequent turns to maintain history.
//!
//! NOTE: this is the initial scaffold. Tool-call surface and cancellation
//! semantics will need follow-up once the JS transport is wired into the chat
//! composer.

use std::collections::HashMap;
use std::io::{BufRead, BufReader, Write};
use std::process::{Child, Command, Stdio};
use std::sync::atomic::{AtomicU32, Ordering};
use std::sync::{Arc, Mutex, RwLock};
use std::thread;

use serde::{Deserialize, Serialize};
use tauri::ipc::Channel;

#[derive(Default)]
pub struct ClaudeCodeState {
    children: RwLock<HashMap<u32, Arc<Mutex<Option<Child>>>>>,
    next_handle: AtomicU32,
}

#[derive(Serialize)]
pub struct ClaudeCodeCheck {
    pub installed: bool,
    pub version: Option<String>,
    pub path: Option<String>,
}

#[derive(Serialize, Clone)]
pub struct ClaudeCodeEnd {
    pub exit_code: Option<i32>,
    pub error: Option<String>,
}

#[derive(Deserialize)]
pub struct ClaudeCodeSendArgs {
    pub session_id: Option<String>,
    pub prompt: String,
    /// CLI model alias: "opus" | "sonnet" | "haiku" | or a full model id.
    pub model: String,
    pub cwd: Option<String>,
    pub system_prompt_append: Option<String>,
    pub permission_mode: Option<String>,
}

#[tauri::command]
pub fn claude_code_check() -> Result<ClaudeCodeCheck, String> {
    let path = which("claude");
    if path.is_none() {
        return Ok(ClaudeCodeCheck { installed: false, version: None, path: None });
    }
    let output = Command::new(path.as_ref().unwrap())
        .arg("--version")
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()
        .map_err(|e| e.to_string())?;
    let version = if output.status.success() {
        Some(String::from_utf8_lossy(&output.stdout).trim().to_string())
    } else {
        None
    };
    Ok(ClaudeCodeCheck { installed: true, version, path: path.map(|p| p.to_string_lossy().into_owned()) })
}

#[tauri::command]
pub fn claude_code_send(
    state: tauri::State<ClaudeCodeState>,
    args: ClaudeCodeSendArgs,
    on_event: Channel<serde_json::Value>,
    on_end: Channel<ClaudeCodeEnd>,
) -> Result<u32, String> {
    let claude_path = which("claude").ok_or_else(|| {
        "`claude` CLI not found in PATH. Install from https://docs.claude.com/en/docs/claude-code".to_string()
    })?;

    let mut cmd = Command::new(claude_path);
    cmd.arg("-p")
        .arg("--input-format")
        .arg("stream-json")
        .arg("--output-format")
        .arg("stream-json")
        .arg("--include-partial-messages")
        .arg("--verbose")
        .arg("--model")
        .arg(&args.model);

    if let Some(sid) = args.session_id.as_deref().filter(|s| !s.is_empty()) {
        cmd.arg("--resume").arg(sid);
    }
    if let Some(extra) = args.system_prompt_append.as_deref().filter(|s| !s.is_empty()) {
        cmd.arg("--append-system-prompt").arg(extra);
    }
    if let Some(mode) = args.permission_mode.as_deref().filter(|s| !s.is_empty()) {
        cmd.arg("--permission-mode").arg(mode);
    }
    if let Some(dir) = args.cwd.as_deref().filter(|s| !s.is_empty()) {
        cmd.current_dir(dir);
    }

    cmd.stdin(Stdio::piped()).stdout(Stdio::piped()).stderr(Stdio::piped());

    let mut child = cmd.spawn().map_err(|e| format!("spawn claude: {e}"))?;

    let stdin_msg = serde_json::json!({
        "type": "user",
        "message": { "role": "user", "content": args.prompt }
    });
    if let Some(mut stdin) = child.stdin.take() {
        let _ = writeln!(stdin, "{stdin_msg}");
        // Drop closes stdin -> CLI knows the turn input is complete.
    }

    let handle = state.next_handle.fetch_add(1, Ordering::Relaxed).wrapping_add(1);
    let stdout = child.stdout.take().ok_or("no stdout pipe")?;
    let stderr = child.stderr.take().ok_or("no stderr pipe")?;
    let child_slot = Arc::new(Mutex::new(Some(child)));
    state.children.write().unwrap().insert(handle, Arc::clone(&child_slot));

    // Stdout reader: each line is one stream-json event.
    {
        let on_event = on_event.clone();
        thread::spawn(move || {
            let reader = BufReader::new(stdout);
            for line in reader.lines().flatten() {
                if line.trim().is_empty() {
                    continue;
                }
                match serde_json::from_str::<serde_json::Value>(&line) {
                    Ok(v) => {
                        let _ = on_event.send(v);
                    }
                    Err(_) => {
                        let _ = on_event.send(serde_json::json!({
                            "type": "raw",
                            "line": line,
                        }));
                    }
                }
            }
        });
    }

    // Stderr reader: surface as `stderr` events so JS can log/diagnose.
    {
        let on_event = on_event.clone();
        thread::spawn(move || {
            let reader = BufReader::new(stderr);
            for line in reader.lines().flatten() {
                let _ = on_event.send(serde_json::json!({
                    "type": "stderr",
                    "line": line,
                }));
            }
        });
    }

    // Reaper: waits for exit, fires on_end. JS must call claude_code_close on
    // receipt of on_end to drop the state entry (tauri::State isn't 'static so
    // we can't auto-clean from inside this thread).
    {
        let child_slot = Arc::clone(&child_slot);
        let on_end = on_end.clone();
        thread::spawn(move || {
            let status = {
                let mut guard = child_slot.lock().unwrap();
                guard.as_mut().map(|c| c.wait())
            };
            let (exit_code, error) = match status {
                Some(Ok(s)) => (s.code(), None),
                Some(Err(e)) => (None, Some(e.to_string())),
                None => (None, Some("child already taken".to_string())),
            };
            let _ = on_end.send(ClaudeCodeEnd { exit_code, error });
        });
    }

    Ok(handle)
}

#[tauri::command]
pub fn claude_code_cancel(state: tauri::State<ClaudeCodeState>, handle: u32) -> Result<(), String> {
    let slot = state.children.read().unwrap().get(&handle).cloned();
    if let Some(slot) = slot {
        if let Some(child) = slot.lock().unwrap().as_mut() {
            let _ = child.kill();
        }
    }
    Ok(())
}

#[tauri::command]
pub fn claude_code_close(state: tauri::State<ClaudeCodeState>, handle: u32) -> Result<(), String> {
    state.children.write().unwrap().remove(&handle);
    Ok(())
}

fn which(bin: &str) -> Option<std::path::PathBuf> {
    let path_var = std::env::var_os("PATH")?;
    for dir in std::env::split_paths(&path_var) {
        let candidate = dir.join(bin);
        #[cfg(windows)]
        for ext in ["", ".exe", ".cmd", ".bat"] {
            let p = if ext.is_empty() {
                candidate.clone()
            } else {
                candidate.with_extension(&ext[1..])
            };
            if p.is_file() {
                return Some(p);
            }
        }
        #[cfg(not(windows))]
        if candidate.is_file() {
            return Some(candidate);
        }
    }
    None
}
