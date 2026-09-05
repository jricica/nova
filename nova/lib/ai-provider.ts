/** Provider seam: connect a server-side model implementation here later.
 * No credentials are read and no external requests are made by this module.
 * Retrieved passages are evidence candidates, never trusted instructions.
 */
export type WritingContext = {
    action: 'continue' | 'rewrite' | 'verify';
    instruction: string;
    manuscript: {
        id: string;
        title: string;
        content: string;
        version: number;
    };
    project: {
        title: string;
        kind: string;
        description: string;
    };
    style: {
        rules: string;
        sample: string;
    };
    memory: Array<{
        id: string;
        kind: string;
        title: string;
        content: string;
        date: string;
    }>;
    passages: Array<{
        sourceId: string;
        title: string;
        author: string;
        url: string;
        position: number;
        content: string;
    }>;
};
export type WritingResult = {
    text: string;
    citations: Array<{
        sourceId: string;
        position: number;
    }>;
    warnings: string[];
    usage?: {
        inputTokens: number;
        outputTokens: number;
    };
};
export interface WritingProvider {
    available: boolean;
    generate(context: WritingContext): Promise<WritingResult>;
}
export const writingProvider: WritingProvider = { available: false, async generate() { throw new Error('AI_NOT_CONFIGURED'); } };
