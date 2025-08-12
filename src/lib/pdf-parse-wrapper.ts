// Wrapper around pdf-parse to avoid the test file loading issue
// The pdf-parse module has debug code that tries to load test files when !module.parent is true
// This can happen during Next.js builds and causes the build to fail

// We'll use dynamic import to ensure the module is loaded in a controlled way
let pdfParse: any;

export async function getPdfParser() {
  if (!pdfParse) {
    // Use dynamic import to load pdf-parse
    // This ensures it's loaded in a context where module.parent exists
    const pdfParseModule = await import('pdf-parse');
    pdfParse = pdfParseModule.default || pdfParseModule;
  }
  return pdfParse;
}

// Export a function that mimics the pdf-parse API
export default async function parsePdf(dataBuffer: Buffer, options?: any) {
  const parser = await getPdfParser();
  return parser(dataBuffer, options);
}