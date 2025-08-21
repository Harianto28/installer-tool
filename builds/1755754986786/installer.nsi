!define PRODUCT_NAME "Enhanced Test"
!define PRODUCT_VERSION "v2.0.0"
!define PRODUCT_DIR "C:\EnhancedApp"

OutFile "Enhanced_Test_Installer.exe"
InstallDir "$PRODUCT_DIR"
Caption "$(PRODUCT_NAME) $(PRODUCT_VERSION)"

Page directory
Page instfiles

Section "Main Application"
    SetOutPath "$INSTDIR"
    SetOverwrite on
    File "Artikel.pdf"
    File "Artikel 2.docx"
SectionEnd

Function .onGUIEnd
    ExecShell "open" "$INSTDIR"
FunctionEnd