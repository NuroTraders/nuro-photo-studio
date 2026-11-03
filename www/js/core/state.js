export function createAppState() {
  return {
    activeDocument: null,
    setActiveDocument(documentInfo) {
      this.activeDocument = documentInfo;
    },
  };
}
