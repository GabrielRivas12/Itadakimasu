const { withDangerousMod } = require("@expo/config-plugins");
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const SDK_MARKERS = ["platform-tools", "platforms"];

function normalizeCandidate(value) {
  if (!value) {
    return null;
  }
  const trimmed = value.trim().replace(/^"(.*)"$/, "$1");
  if (!trimmed) {
    return null;
  }
  return path.normalize(
    trimmed.replace(/%([^%]+)%/g, (match, name) => process.env[name] || match)
  );
}

function isAndroidSdkDir(candidate) {
  if (!candidate) {
    return false;
  }
  try {
    if (!fs.statSync(candidate).isDirectory()) {
      return false;
    }
  } catch {
    return false;
  }
  return SDK_MARKERS.every((marker) =>
    fs.existsSync(path.join(candidate, marker))
  );
}

function findSdkFromPath() {
  try {
    const output = execFileSync("where.exe", ["adb"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      windowsHide: true,
    });
    for (const line of output.split(/\r?\n/)) {
      const adbPath = line.trim();
      if (!adbPath) {
        continue;
      }
      const sdkDir = path.dirname(path.dirname(adbPath));
      if (isAndroidSdkDir(sdkDir)) {
        return sdkDir;
      }
    }
  } catch {
    // adb is not in PATH.
  }
  return null;
}

function findSdkFromAndroidStudio() {
  const googleDir = path.join(process.env.APPDATA || "", "Google");
  let entries = [];
  try {
    entries = fs.readdirSync(googleDir, { withFileTypes: true });
  } catch {
    return null;
  }

  const studioDirs = entries
    .filter(
      (entry) =>
        entry.isDirectory() &&
        entry.name.startsWith("AndroidStudio") &&
        !entry.name.endsWith("-backup")
    )
    .map((entry) => entry.name)
    .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));

  for (const studioDir of studioDirs) {
    const configPath = path.join(
      googleDir,
      studioDir,
      "options",
      "android.sdk.path.xml"
    );
    try {
      const contents = fs.readFileSync(configPath, "utf8");
      const match = contents.match(
        /androidSdkAbsolutePath"\s+value="([^"]+)"/
      );
      const candidate = normalizeCandidate(match && match[1]);
      if (isAndroidSdkDir(candidate)) {
        return candidate;
      }
    } catch {
      // Android Studio version has no stored SDK path.
    }
  }
  return null;
}

function findSdkFromRegistry() {
  const keys = [
    "HKLM\\SOFTWARE\\Android SDK Tools",
    "HKLM\\SOFTWARE\\WOW6432Node\\Android SDK Tools",
    "HKCU\\Software\\Android SDK Tools",
  ];

  for (const key of keys) {
    try {
      const output = execFileSync("reg.exe", ["query", key, "/v", "Path"], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
        windowsHide: true,
      });
      const match = output.match(/Path\s+REG_(?:EXPAND_)?SZ\s+(.+)/i);
      const candidate = normalizeCandidate(match && match[1]);
      if (isAndroidSdkDir(candidate)) {
        return candidate;
      }
    } catch {
      // Registry key does not exist.
    }
  }
  return null;
}

function commonSdkDirs() {
  const localAppData = process.env.LOCALAPPDATA;
  const userProfile = process.env.USERPROFILE;
  const programFiles = process.env["ProgramFiles"];
  const programFilesX86 = process.env["ProgramFiles(x86)"];

  return [
    localAppData && path.join(localAppData, "Android", "Sdk"),
    userProfile && path.join(userProfile, "AppData", "Local", "Android", "Sdk"),
    programFiles && path.join(programFiles, "Android", "Sdk"),
    programFilesX86 && path.join(programFilesX86, "Android", "android-sdk"),
    "C:\\Android\\Sdk",
    "C:\\Android\\android-sdk",
  ].filter(Boolean);
}

function detectAndroidSdkDir(override) {
  const envCandidates = ["ANDROID_HOME", "ANDROID_SDK_ROOT", "ANDROID_SDK_HOME"]
    .map((name) => process.env[name])
    .filter(Boolean);

  const candidates = [override, ...envCandidates, ...commonSdkDirs()];

  for (const value of candidates) {
    const candidate = normalizeCandidate(value);
    if (isAndroidSdkDir(candidate)) {
      return candidate;
    }
  }

  return findSdkFromPath() || findSdkFromAndroidStudio() || findSdkFromRegistry();
}

function toPropertiesPath(value) {
  return value.replace(/\\/g, "\\\\");
}

module.exports = function withAndroidLocalProperties(config, props = {}) {
  return withDangerousMod(config, [
    "android",
    async (config) => {
      if (process.platform !== "win32") {
        return config;
      }

      const sdkDir = detectAndroidSdkDir(props.sdkDir);
      if (!sdkDir) {
        console.warn(
          "[withAndroidLocalProperties] No se encontró el Android SDK en esta máquina. " +
            "Se omite local.properties; configura sdkDir en el plugin o la variable ANDROID_HOME."
        );
        return config;
      }

      const filePath = path.join(
        config.modRequest.platformProjectRoot,
        "local.properties"
      );
      const sdkLine = `sdk.dir=${toPropertiesPath(sdkDir)}`;

      let existing = "";
      try {
        existing = await fs.promises.readFile(filePath, "utf8");
      } catch {
        existing = "";
      }

      const lines = existing
        .split(/\r?\n/)
        .filter((line) => !/^\s*sdk\.dir\s*=/.test(line));

      while (lines.length > 0 && lines[lines.length - 1].trim() === "") {
        lines.pop();
      }

      lines.push(sdkLine);

      await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
      await fs.promises.writeFile(filePath, `${lines.join("\n")}\n`, "utf8");

      return config;
    },
  ]);
};

module.exports.detectAndroidSdkDir = detectAndroidSdkDir;
