on run argv
  set targetPID to (item 1 of argv) as integer
  set targetWidth to (item 2 of argv) as integer
  tell application "System Events"
    set targetProcess to first application process whose unix id is targetPID
    tell targetProcess
      set frontmost to true
      set size of front window to {targetWidth, 900}
      return {position of front window, size of front window}
    end tell
  end tell
end run
