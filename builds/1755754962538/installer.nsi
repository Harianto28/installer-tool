!define PRODUCT_NAME "Initial Test"
!define PRODUCT_VERSION "v1.0.0"
!define PRODUCT_DIR "C:\TestApp"

OutFile "Initial_Test_Installer.exe"
InstallDir "$PRODUCT_DIR"
Caption "$(PRODUCT_NAME) $(PRODUCT_VERSION)"

Page directory
Page instfiles

Section "Main Application"
    SetOutPath "$INSTDIR"
    SetOverwrite on
    File "Artikel.pdf"
SectionEnd

Function .onGUIEnd
    ExecShell "open" "$INSTDIR"
FunctionEnd