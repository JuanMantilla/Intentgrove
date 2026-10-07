# Diagnostic experiments only, not a substitute for compiled Rust adapter tests.
# Run with PowerShell's existing policy; no installations, user documents or app data.
param([string]$EvidenceDirectory = $PSScriptRoot, [switch]$InspectAncestors, [switch]$InspectDirectoryOptions)
$ErrorActionPreference = 'Stop'
Add-Type -TypeDefinition @'
using System;
using System.IO;
using System.Runtime.InteropServices;
using Microsoft.Win32.SafeHandles;
public static class F007WNativeProbe {
    [StructLayout(LayoutKind.Sequential)] struct UnicodeString {
        public ushort Length, MaximumLength; public IntPtr Buffer;
    }
    [StructLayout(LayoutKind.Sequential)] struct ObjectAttributes {
        public uint Length; public IntPtr RootDirectory, ObjectName;
        public uint Attributes; public IntPtr SecurityDescriptor, SecurityQualityOfService;
    }
    [StructLayout(LayoutKind.Sequential)] struct IoStatus {
        public IntPtr Status; public UIntPtr Information;
    }
    [DllImport("ntdll.dll")] static extern int NtCreateFile(out IntPtr handle,
        uint access, ref ObjectAttributes attributes, out IoStatus status, IntPtr allocation,
        uint fileAttributes, uint share, uint disposition, uint options, IntPtr ea, uint eaLength);
    [DllImport("ntdll.dll")] static extern uint RtlNtStatusToDosError(int status);
    [DllImport("ntdll.dll")] static extern int NtSetInformationFile(SafeFileHandle handle,
        out IoStatus status, IntPtr information, uint size, int informationClass);
    [DllImport("kernel32.dll", CharSet=CharSet.Unicode, SetLastError=true)]
    static extern SafeFileHandle CreateFileW(string path, uint access, uint share,
        IntPtr security, uint disposition, uint flags, IntPtr template);
    [DllImport("kernel32.dll", SetLastError=true)] static extern bool
        SetFileInformationByHandle(SafeFileHandle handle, int informationClass,
            IntPtr information, uint size);
    [DllImport("kernel32.dll", SetLastError=true)] static extern SafeFileHandle
        ReOpenFile(SafeFileHandle handle, uint access, uint share, uint flags);
    [DllImport("kernel32.dll", CharSet=CharSet.Unicode, SetLastError=true)]
    static extern bool ReplaceFileW(string target, string stage, string backup,
        uint flags, IntPtr excluded, IntPtr reserved);
    public static SafeFileHandle Open(string path, uint access, uint share) {
        var handle = CreateFileW(path, access, share, IntPtr.Zero, 3,
            0x02000000 | 0x00200000 | 0x00100000, IntPtr.Zero);
        if (handle.IsInvalid) {
            int error = Marshal.GetLastWin32Error(); handle.Dispose();
            throw new System.ComponentModel.Win32Exception(error);
        }
        return handle;
    }
    public static SafeFileHandle Relative(SafeFileHandle parent, string name, uint access) {
        return RelativeOptions(parent, name, access, 0, 1, 0x00600020);
    }
    public static SafeFileHandle RelativeOptions(SafeFileHandle parent, string name,
        uint access, uint attributes, uint disposition, uint options) {
        IntPtr text = Marshal.StringToHGlobalUni(name);
        IntPtr unicode = Marshal.AllocHGlobal(Marshal.SizeOf(typeof(UnicodeString)));
        try {
            var value = new UnicodeString { Length=(ushort)(name.Length*2),
                MaximumLength=(ushort)(name.Length*2), Buffer=text };
            Marshal.StructureToPtr(value, unicode, false);
            var attr = new ObjectAttributes { Length=(uint)Marshal.SizeOf(typeof(ObjectAttributes)),
                RootDirectory=parent.DangerousGetHandle(), ObjectName=unicode, Attributes=0x1000 };
            IoStatus status; IntPtr handle;
            int code = NtCreateFile(out handle, access | 0x00100000, ref attr, out status,
                IntPtr.Zero, attributes, 7, disposition, options, IntPtr.Zero, 0);
            if (code < 0) throw new System.ComponentModel.Win32Exception(
                (int)RtlNtStatusToDosError(code), "NTSTATUS 0x" + code.ToString("x8"));
            return new SafeFileHandle(handle, true);
        } finally { Marshal.FreeHGlobal(unicode); Marshal.FreeHGlobal(text); }
    }
    public static int Rename(SafeFileHandle stage, SafeFileHandle parent, string target, bool replace) {
        // FILE_RENAME_INFO x64 layout matches the project target: union 0, root 8,
        // byte length 16, UTF-16 filename 20. No POSIX/ignore-sharing flags.
        byte[] name = System.Text.Encoding.Unicode.GetBytes(target + "\0");
        int size = 24 + name.Length;
        IntPtr info = Marshal.AllocHGlobal(size);
        try {
            Marshal.Copy(new byte[size], 0, info, size);
            Marshal.WriteByte(info, replace ? (byte)1 : (byte)0);
            Marshal.WriteIntPtr(info, 8, parent.DangerousGetHandle());
            Marshal.WriteInt32(info, 16, name.Length-2);
            Marshal.Copy(name, 0, IntPtr.Add(info, 20), name.Length);
            int win32 = SetFileInformationByHandle(stage, 3, info, (uint)size)
                ? 0 : Marshal.GetLastWin32Error();
            Console.WriteLine("Win32 relative rename result: " + win32);
            Assert(win32 == 87, "Win32 wrapper rejects held-parent relative rename (87)");
            IoStatus status;
            int code = NtSetInformationFile(stage, out status, info, (uint)size, 10);
            return code < 0 ? (int)RtlNtStatusToDosError(code) : 0;
        } finally { Marshal.FreeHGlobal(info); }
    }
    public static int Replace(string target, string stage, string backup) {
        return ReplaceFileW(target, stage, backup, 0, IntPtr.Zero, IntPtr.Zero)
            ? 0 : Marshal.GetLastWin32Error();
    }
    public static void Assert(bool value, string label) {
        if (!value) throw new Exception("FAIL: " + label);
        Console.WriteLine("PASS: " + label);
    }
    static string Read(string path) {
        using (var file = new FileStream(path, FileMode.Open, FileAccess.Read,
            FileShare.ReadWrite | FileShare.Delete))
        using (var reader = new StreamReader(file)) return reader.ReadToEnd();
    }
    public static void InspectAncestors(string root) {
        if (IntPtr.Size != 8) throw new Exception("x64 runner required");
        SafeFileHandle ancestor = Open("\\\\?\\" + Path.GetPathRoot(root), 0x20081, 7);
        try {
            foreach (string segment in Path.GetFullPath(root).Substring(3).Split('\\')) {
                Console.WriteLine("Inspect ancestor: " + segment);
                try {
                    using (var enumeration = Relative(ancestor, segment, 0x20081)) {
                        Console.WriteLine("  list/read-control open: PASS");
                    }
                } catch (System.ComponentModel.Win32Exception error) {
                    Console.WriteLine("  list/read-control open: Win32 " + error.NativeErrorCode);
                }
                var next = Relative(ancestor, segment, 0xA0); // attributes + traverse only
                ancestor.Dispose(); ancestor = next;
                Console.WriteLine("  attributes/traverse open: PASS");
            }
        } finally { ancestor.Dispose(); }
    }
    public static void InspectDirectoryOptions(string root) {
        using (var parent = Open(root, 0x20081, 7)) {
            foreach (uint attributes in new uint[] { 0x10, 0x80 }) {
                foreach (uint options in new uint[] { 0x00600021, 0x00200021, 0x21 }) {
                    string name = "dir-" + attributes.ToString("x") + "-" + options.ToString("x");
                    try {
                        using (var created = RelativeOptions(parent, name, 0x20080, attributes, 3, options))
                            Console.WriteLine("CREATE PASS attributes=" + attributes.ToString("x") + " options=" + options.ToString("x"));
                    } catch (System.ComponentModel.Win32Exception error) {
                        Console.WriteLine("CREATE FAIL attributes=" + attributes.ToString("x") + " options=" + options.ToString("x") + " error=" + error.NativeErrorCode);
                    }
                }
            }
            using (var original = Relative(parent, "dir-80-21", 0x20081)) {
                foreach (uint flags in new uint[] { 0x02300000, 0x02200000 }) {
                    using (var reopened = ReOpenFile(original, 0x20081, 7, flags))
                        Console.WriteLine("REOPEN flags=" + flags.ToString("x") + " result=" + (reopened.IsInvalid ? Marshal.GetLastWin32Error() : 0));
                }
                using (var reopened = Relative(original, "", 0x20081))
                    Assert(!reopened.IsInvalid, "empty relative name reopens held directory with no-recall/reparse flags");
            }
        }
    }
    public static void Run(string root) {
        if (IntPtr.Size != 8) throw new Exception("x64 runner required");
        string selected = Path.Combine(root, "Caf\u00e9 space");
        Directory.CreateDirectory(selected);
        string original = Path.Combine(selected, "Read.MD");
        byte[] bytes = {239,187,191,35,32,65,13,10};
        File.WriteAllBytes(original, bytes);
        using (var parent = Open(selected, 0x20081, 7)) {
            using (var file = Relative(parent, "Read.MD", 0x20081)) {
                Assert(!file.IsInvalid, "anchored Unicode/spaced NT open with no-recall flags");
            }
            string moved = Path.Combine(root, "moved");
            Directory.Move(selected, moved);
            Directory.CreateDirectory(selected);
            File.WriteAllText(Path.Combine(selected, "Read.MD"), "outside");
            using (var file = Relative(parent, "Read.MD", 0x20081))
            using (var stream = new FileStream(file, FileAccess.Read)) {
                byte[] actual = new byte[bytes.Length];
                Assert(stream.Read(actual, 0, actual.Length) == bytes.Length &&
                    Convert.ToBase64String(actual) == Convert.ToBase64String(bytes),
                    "held parent survives replacement and preserves BOM/CRLF bytes");
            }
            string current = Path.Combine(moved, "current.json");
            string stage = Path.Combine(moved, "stage.tmp");
            File.WriteAllText(current, "acknowledged"); File.WriteAllText(stage, "pending");
            using (var stageHandle = Open(stage, 0x30083, 7)) {
                using (var locked = Open(current, 0x20081, 3)) {
                    int code = Rename(stageHandle, parent, "current.json", true);
                    Console.WriteLine("Rename locked destination: Win32 " + code +
                        "; current=" + Read(current) + "; stage=" + Read(stage));
                    Assert(code == 5 && Read(current) == "acknowledged" &&
                        Read(stage) == "pending", "native denied-delete sharing keeps current/stage (Win32 5)");
                }
                Assert(Rename(stageHandle, parent, "current.json", true) == 0 &&
                    Read(current) == "pending" && !File.Exists(stage),
                    "anchored publication succeeds after lock release");
            }
            File.WriteAllText(stage, "new copy");
            using (var stageHandle = Open(stage, 0x30083, 7)) {
                int code = Rename(stageHandle, parent, "current.json", false);
                Assert((code == 80 || code == 183) && Read(current) == "pending" &&
                    Read(stage) == "new copy", "no-replace publication retains collision bytes (Win32 " + code + ")");
            }
            string backup = Path.Combine(moved, "backup.tmp");
            using (var openStage = Open(stage, 0x30083, 7)) {
                int code = Replace(current, stage, backup);
                Assert(code == 32 && Read(current) == "pending" &&
                    Read(stage) == "new copy", "ReplaceFileW rejects still-open stage (Win32 32)");
            }
            var oldAcl = File.GetAccessControl(current).GetSecurityDescriptorBinaryForm();
            DateTime creation = File.GetCreationTimeUtc(current);
            Assert(Replace(current, stage, backup) == 0 && Read(current) == "new copy" &&
                Read(backup) == "pending" && File.GetCreationTimeUtc(current) == creation &&
                Convert.ToBase64String(File.GetAccessControl(current).GetSecurityDescriptorBinaryForm()) ==
                Convert.ToBase64String(oldAcl), "closed-stage replacement keeps observed DACL/creation time and backup bytes");
            // Deterministic external-writer interleaving, not a concurrency-suite PASS.
            string observed = Read(current);
            File.WriteAllText(stage, "next draft");
            File.WriteAllText(current, "intervening writer");
            string raceBackup = Path.Combine(moved, "race-backup.tmp");
            Assert(observed == "new copy" && Replace(current, stage, raceBackup) == 0 &&
                Read(current) == "next draft" && Read(raceBackup) == "intervening writer",
                "ReplaceFileW overwrites an intervening write: replacement is not compare-and-swap");
        }
    }
}
'@
$workspace = [IO.Path]::GetFullPath((Join-Path $EvidenceDirectory '../../..'))
$cache = Join-Path $workspace '.cache'
[IO.Directory]::CreateDirectory($cache) | Out-Null
$fixture = Join-Path $cache ('f007w-native-probe-' + [Guid]::NewGuid().ToString('N'))
[IO.Directory]::CreateDirectory($fixture) | Out-Null
Write-Output ('Fixture: ' + $fixture)
if ($InspectAncestors) { [F007WNativeProbe]::InspectAncestors($fixture) }
elseif ($InspectDirectoryOptions) { [F007WNativeProbe]::InspectDirectoryOptions($fixture) }
else { [F007WNativeProbe]::Run($fixture) }
# Retain only owned evidence fixtures, even on success; no recursive cleanup.
Write-Output 'Diagnostic experiments complete; Rust adapter and durability gates remain NOT RUN.'
