import { z } from 'zod';

const answer = z.string().trim().max(2000);
export const authorDataSchema = z.object({
  name: z.string().trim().max(100).default(''),
  genre: z.enum(['novela', 'ensayo', 'academico']).default('ensayo'),
  audience: answer.default(''),
  purpose: answer.default(''),
  tone: z.enum(['cercano', 'formal', 'reflexivo', 'directo']).default('directo'),
  rhythm: z.enum(['breve', 'desarrollado', 'variado']).default('variado'),
  avoid: answer.default(''),
  expressions: answer.default(''),
  spoken: answer.default(''),
  exercise: z.string().max(10000).default(''),
  comparison: z.enum(['directo', 'narrativo', 'ninguno']).default('ninguno'),
  review: answer.default(''),
  step: z.number().int().min(0).max(3).default(0),
  promptIndex: z.number().int().min(0).max(2).default(0),
  memories: z.array(z.object({
    id: z.string().uuid(), content: z.string().trim().min(1).max(2000),
    project: z.string().uuid().nullable(), enabled: z.boolean(),
    updated: z.string().datetime(),
  })).max(100).default([]),
});
export type AuthorData = z.infer<typeof authorDataSchema>;
export const emptyAuthor = (): AuthorData => authorDataSchema.parse({});
export const tones = { cercano: 'Cercano', formal: 'Formal', reflexivo: 'Reflexivo', directo: 'Directo' };
export const rhythms = { breve: 'Frases breves', desarrollado: 'Explicaciones desarrolladas', variado: 'Ritmo variado' };
export function profileRules(d: AuthorData) {
  return [
    `Tono elegido: ${tones[d.tone]}. Ritmo: ${rhythms[d.rhythm]}.`,
    d.audience && `Audiencia: ${d.audience}`, d.purpose && `Intención: ${d.purpose}`,
    d.avoid && `Evitar: ${d.avoid}`, d.expressions && `Expresiones propias: ${d.expressions}`,
    d.review && `Precisiones del autor: ${d.review}`,
    d.spoken && `Diferencias entre habla y escritura indicadas por el autor: ${d.spoken}`,
    d.comparison !== 'ninguno' && `Preferencia en el ejercicio comparativo: ejemplo ${d.comparison}. No es una regla absoluta.`,
  ].filter(Boolean).join('\n');
}
export function writingPrompts(d: AuthorData) {
  const prompts = {
    novela: ['Describe un lugar a través de lo que recuerda un personaje.', 'Escribe una conversación en la que alguien oculta una preocupación.', 'Cuenta una decisión cotidiana que cambió una relación.'],
    ensayo: ['Defiende una idea y responde a su objeción más fuerte.', 'Explica una convicción que hayas cambiado y por qué.', 'Usa una experiencia concreta para desarrollar un argumento.'],
    academico: ['Explica un concepto de tu disciplina con un ejemplo.', 'Distingue dos conceptos que suelen confundirse.', 'Redacta una pregunta de investigación y explica su importancia.'],
  };
  return prompts[d.genre];
}
