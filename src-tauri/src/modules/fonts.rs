// Returns a sorted, de-duplicated list of font family names available on the
// system. macOS uses CoreText via direct FFI (no extra crate). Linux shells
// out to `fc-list`. Windows currently returns an empty list — the UI falls
// back to the freeform input.

#[tauri::command]
pub fn fonts_list_system() -> Result<Vec<String>, String> {
    #[cfg(target_os = "macos")]
    {
        macos::list()
    }
    #[cfg(target_os = "linux")]
    {
        linux::list()
    }
    #[cfg(not(any(target_os = "macos", target_os = "linux")))]
    {
        Ok(Vec::new())
    }
}

#[cfg(target_os = "macos")]
mod macos {
    use std::ffi::CStr;
    use std::os::raw::{c_char, c_void};

    #[repr(C)]
    struct OpaqueArray(c_void);
    type CFArrayRef = *const OpaqueArray;

    #[repr(C)]
    struct OpaqueString(c_void);
    type CFStringRef = *const OpaqueString;

    const K_CF_STRING_ENCODING_UTF8: u32 = 0x0800_0100;

    #[link(name = "CoreText", kind = "framework")]
    extern "C" {
        fn CTFontManagerCopyAvailableFontFamilyNames() -> CFArrayRef;
    }

    #[link(name = "CoreFoundation", kind = "framework")]
    extern "C" {
        fn CFArrayGetCount(arr: CFArrayRef) -> isize;
        fn CFArrayGetValueAtIndex(arr: CFArrayRef, index: isize) -> *const c_void;
        fn CFStringGetLength(s: CFStringRef) -> isize;
        fn CFStringGetCString(
            s: CFStringRef,
            buffer: *mut c_char,
            buf_size: isize,
            encoding: u32,
        ) -> bool;
        fn CFRelease(cf: *const c_void);
    }

    pub fn list() -> Result<Vec<String>, String> {
        // CTFontManagerCopyAvailableFontFamilyNames is documented thread-safe,
        // so this command can run off the main thread without trouble.
        unsafe {
            let families = CTFontManagerCopyAvailableFontFamilyNames();
            if families.is_null() {
                return Ok(Vec::new());
            }
            let count = CFArrayGetCount(families) as usize;
            let mut result: Vec<String> = Vec::with_capacity(count);
            for i in 0..count {
                let cf_str =
                    CFArrayGetValueAtIndex(families, i as isize) as CFStringRef;
                if cf_str.is_null() {
                    continue;
                }
                // UTF-8 needs up to 4 bytes per CFString unit + null terminator.
                let buf_size = CFStringGetLength(cf_str) as usize * 4 + 1;
                let mut buf = vec![0i8; buf_size];
                if CFStringGetCString(
                    cf_str,
                    buf.as_mut_ptr(),
                    buf_size as isize,
                    K_CF_STRING_ENCODING_UTF8,
                ) {
                    let cstr = CStr::from_ptr(buf.as_ptr());
                    if let Ok(s) = cstr.to_str() {
                        // CoreText surfaces aliased families starting with
                        // "." (e.g. ".AppleSystemUIFont"); hide them.
                        if !s.starts_with('.') {
                            result.push(s.to_owned());
                        }
                    }
                }
            }
            CFRelease(families as *const c_void);
            result.sort_unstable();
            result.dedup();
            Ok(result)
        }
    }
}

#[cfg(target_os = "linux")]
mod linux {
    use std::collections::BTreeSet;
    use std::process::Command;

    pub fn list() -> Result<Vec<String>, String> {
        let out = Command::new("fc-list")
            .args([":", "family"])
            .output()
            .map_err(|e| e.to_string())?;
        if !out.status.success() {
            return Ok(Vec::new());
        }
        let stdout = String::from_utf8_lossy(&out.stdout);
        let mut set: BTreeSet<String> = BTreeSet::new();
        for line in stdout.lines() {
            // fc-list returns aliases comma-separated; take the first name.
            let first = line.split(',').next().unwrap_or("").trim();
            if !first.is_empty() {
                set.insert(first.to_owned());
            }
        }
        Ok(set.into_iter().collect())
    }
}
