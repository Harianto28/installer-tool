OutFile "test_installer.exe"
InstallDir "C:\TestApp"
Section "Install Files"
  SetOutPath "$INSTDIR"
  File "test_upload.txt"
SectionEnd