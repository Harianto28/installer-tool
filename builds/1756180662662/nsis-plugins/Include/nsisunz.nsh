; NSIS Unzip Plugin Include File
; This provides the nsisunz::UnzipToLog function

!ifndef NSISUNZ_INCLUDED
!define NSISUNZ_INCLUDED

!include LogicLib.nsh

; Function to unzip files with logging
!macro UnzipToLog zipfile extractpath
  nsisunz::UnzipToLog "${zipfile}" "${extractpath}"
  Pop $0
  ${If} $0 != "OK"
    DetailPrint "Failed to unzip ${zipfile}: $0"
    ; ZIP file kept for debugging since unzip failed
  ${Else}
    DetailPrint "Successfully unzipped ${zipfile} to ${extractpath}"
    ; Note: ZIP file deletion should be handled by the calling script
  ${EndIf}
!macroend

!define UnzipToLog "!insertmacro UnzipToLog"

!endif ; NSISUNZ_INCLUDED
