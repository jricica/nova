import { z } from 'zod';
export const accountSchema = z.object({
    displayName: z.string().trim().max(100).default(''),
    occupation: z.string().trim().max(160).default(''),
    bio: z.string().trim().max(2000).default(''),
    typography: z.enum(['serif', 'sans']).default('serif'),
    textSize: z.enum(['standard', 'large']).default('standard'),
    defaultGoal: z.number().int().min(1).max(2000000).default(50000),
});
export type AccountData = z.infer<typeof accountSchema>;
export type AccountRecord = {
    data: AccountData;
    version: number;
    updated: string | null;
    identity: {
        email: string;
        fullName: string | null;
    };
};
export const defaultAccount = (): AccountData => accountSchema.parse({});
export function initials(name: string) {
    return name.trim().split(/\s+/).slice(0, 2).map(v => [...v][0] || '').join('').toLocaleUpperCase() || 'AU';
}
