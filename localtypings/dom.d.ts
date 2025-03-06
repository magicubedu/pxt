interface Navigator {
    msSaveOrOpenBlob(blob: any, defaultName?: string): boolean;
}

type BlockContent = {
    ts?: string;
    blocks?: string;
};

interface Window {
    blockCopyHandler(data: any): void;
    blockPasteHandler(fn: (content: BlockContent) => void): void;
    importBlocks(content: BlockContent): void;
}