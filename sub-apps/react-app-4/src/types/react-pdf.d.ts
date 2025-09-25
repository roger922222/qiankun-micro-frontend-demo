declare module 'react-pdf' {
  import { ComponentType } from 'react';

  export interface DocumentProps {
    file: string | ArrayBuffer | File;
    onLoadSuccess?: (pdf: { numPages: number }) => void;
    onLoadError?: (error: Error) => void;
    loading?: React.ReactNode;
    error?: React.ReactNode;
    children?: React.ReactNode;
  }

  export interface PageProps {
    pageNumber: number;
    scale?: number;
    width?: number;
    height?: number;
    loading?: React.ReactNode;
    error?: React.ReactNode;
    onLoadSuccess?: (page: any) => void;
    onLoadError?: (error: Error) => void;
  }

  export const Document: ComponentType<DocumentProps>;
  export const Page: ComponentType<PageProps>;

  export const pdfjs: {
    GlobalWorkerOptions: {
      workerSrc: string;
    };
    version: string;
  };
}

declare module 'docx-preview' {
  export function renderAsync(
    data: ArrayBuffer,
    container: HTMLElement,
    styleContainer?: HTMLElement,
    options?: any
  ): Promise<void>;
}