use std::process::Command;

pub struct PsResult {
    pub stdout: String,
    pub stderr: String,
    pub success: bool,
}

pub fn run_ps(script: &str) -> Result<PsResult, String> {
    let output = Command::new("powershell")
        .args([
            "-NoProfile",
            "-NonInteractive",
            "-WindowStyle",
            "Hidden",
            "-Command",
            script,
        ])
        .output()
        .map_err(|e| format!("Failed to execute PowerShell: {}", e))?;

    Ok(PsResult {
        stdout: String::from_utf8_lossy(&output.stdout).to_string(),
        stderr: String::from_utf8_lossy(&output.stderr).to_string(),
        success: output.status.success(),
    })
}

pub fn run_ps_elevated(script: &str) -> Result<PsResult, String> {
    let temp_dir = std::env::temp_dir();
    let id = std::process::id();
    let ts = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis();
    let stdout_file = temp_dir.join(format!("pco_out_{}_{}.txt", id, ts));
    let stderr_file = temp_dir.join(format!("pco_err_{}_{}.txt", id, ts));
    let exit_file = temp_dir.join(format!("pco_exit_{}_{}.txt", id, ts));

    let inner_script = format!(
        "{}\r\n$LASTEXITCODE_REAL = if ($?) {{ 0 }} else {{ 1 }}\r\n\
         [IO.File]::WriteAllText('{}', $LASTEXITCODE_REAL.ToString())",
        script,
        exit_file.to_string_lossy().replace('\'', "''")
    );
    let encoded = base64_encode_utf16(&inner_script);

    let launcher = format!(
        "Start-Process powershell -Verb RunAs -Wait \
         -ArgumentList '-NoProfile','-NonInteractive','-EncodedCommand','{}' \
         -RedirectStandardOutput '{}' \
         -RedirectStandardError '{}'",
        encoded,
        stdout_file.to_string_lossy().replace('\'', "''"),
        stderr_file.to_string_lossy().replace('\'', "''"),
    );

    let output = Command::new("powershell")
        .args(["-NoProfile", "-NonInteractive", "-Command", &launcher])
        .output()
        .map_err(|e| format!("Failed to execute elevated PowerShell: {}", e))?;

    if !output.status.success() {
        let parent_stderr = String::from_utf8_lossy(&output.stderr).to_string();
        let _ = std::fs::remove_file(&stdout_file);
        let _ = std::fs::remove_file(&stderr_file);
        let _ = std::fs::remove_file(&exit_file);
        return Err(format!("UAC elevation failed or was cancelled: {}", parent_stderr));
    }

    let stdout = std::fs::read_to_string(&stdout_file).unwrap_or_default();
    let stderr = std::fs::read_to_string(&stderr_file).unwrap_or_default();
    let exit_code_str = std::fs::read_to_string(&exit_file).unwrap_or_default();

    let _ = std::fs::remove_file(&stdout_file);
    let _ = std::fs::remove_file(&stderr_file);
    let _ = std::fs::remove_file(&exit_file);

    let success = stderr.trim().is_empty()
        && exit_code_str.trim().parse::<i32>().unwrap_or(1) == 0;

    Ok(PsResult {
        stdout,
        stderr,
        success,
    })
}

fn base64_encode_utf16(input: &str) -> String {
    use std::io::Write;
    let utf16: Vec<u8> = input
        .encode_utf16()
        .flat_map(|c| c.to_le_bytes())
        .collect();
    let mut buf = Vec::new();
    {
        let mut encoder = Base64Encoder::new(&mut buf);
        encoder.write_all(&utf16).unwrap();
        encoder.finish().unwrap();
    }
    String::from_utf8(buf).unwrap()
}

struct Base64Encoder<W: std::io::Write> {
    writer: W,
    buffer: Vec<u8>,
}

impl<W: std::io::Write> Base64Encoder<W> {
    fn new(writer: W) -> Self {
        Self {
            writer,
            buffer: Vec::new(),
        }
    }

    fn finish(mut self) -> std::io::Result<()> {
        const CHARS: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        let len = self.buffer.len();
        let rem = len % 3;
        let main_len = len - rem;

        for chunk in self.buffer[..main_len].chunks(3) {
            let n = (chunk[0] as u32) << 16 | (chunk[1] as u32) << 8 | (chunk[2] as u32);
            self.writer.write_all(&[
                CHARS[(n >> 18 & 0x3F) as usize],
                CHARS[(n >> 12 & 0x3F) as usize],
                CHARS[(n >> 6 & 0x3F) as usize],
                CHARS[(n & 0x3F) as usize],
            ])?;
        }

        if rem == 1 {
            let n = (self.buffer[main_len] as u32) << 16;
            self.writer.write_all(&[
                CHARS[(n >> 18 & 0x3F) as usize],
                CHARS[(n >> 12 & 0x3F) as usize],
                b'=',
                b'=',
            ])?;
        } else if rem == 2 {
            let n = (self.buffer[main_len] as u32) << 16
                | (self.buffer[main_len + 1] as u32) << 8;
            self.writer.write_all(&[
                CHARS[(n >> 18 & 0x3F) as usize],
                CHARS[(n >> 12 & 0x3F) as usize],
                CHARS[(n >> 6 & 0x3F) as usize],
                b'=',
            ])?;
        }

        Ok(())
    }
}

impl<W: std::io::Write> std::io::Write for Base64Encoder<W> {
    fn write(&mut self, buf: &[u8]) -> std::io::Result<usize> {
        self.buffer.extend_from_slice(buf);
        Ok(buf.len())
    }

    fn flush(&mut self) -> std::io::Result<()> {
        Ok(())
    }
}
