interface Navigator {
    msSaveOrOpenBlob(blob: any, defaultName?: string): boolean;
}

interface Window {
    blockCopyHandler(data: any): void;
    blockPasteHandler(fn: (content: {
        ts?: string;
        blocks?: string;
    }) => void): void;
}