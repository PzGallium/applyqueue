/** Minimal types for dynamic import('puppeteer') when package may not be installed at type-check time. */
declare module 'puppeteer' {
  export interface PDFOptions {
    format?: string;
    printBackground?: boolean;
    margin?: { top?: string; right?: string; bottom?: string; left?: string };
  }
  export interface Page {
    setContent(html: string, options?: { waitUntil?: string }): Promise<void>;
    pdf(options?: PDFOptions): Promise<Buffer | Uint8Array>;
  }
  export interface Browser {
    newPage(): Promise<Page>;
    close(): Promise<void>;
  }
  export interface LaunchOptions {
    headless?: boolean;
    args?: string[];
  }
  export function launch(options?: LaunchOptions): Promise<Browser>;
}
