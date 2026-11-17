# Design system — "Navy & Gold"

## Why it looks the way it does

Buying property is the largest purchase most people make. The interface has to feel like a safe
pair of hands before it feels exciting.

| Choice                                                        | Psychology                                                                                                     |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Deep navy** (`--color-brand #0c1f3f`)                       | The colour of banks, insurers and law firms: stability, competence, trust.                                     |
| **Warm gold** (`--color-gold #c8a25a`), used sparingly        | Premium property and achievement. Reserved mostly for the primary action, so the eye always knows where to go. |
| **Ivory neutrals and white space**                            | Calm reads as expensive; clutter reads as cheap.                                                               |
| **Fraunces serif for headlines**, Manrope for everything else | A serif signals craft and permanence; the sans keeps the product crisp and legible, including Devanagari.      |
| **Real 4K photography** of homes and interiors                | People decide emotionally first. Homes, light and keys make the outcome tangible.                              |
| **The product shown, not described**                          | A chat and a qualified lead card in the hero make "what we do" obvious in five seconds.                        |
| **No invented logos, testimonials or numbers**                | Honesty is part of trust. Fake social proof is the fastest way to lose a cautious buyer.                       |

## Landing page structure

1. Recognition — hero names the audience and outcome, one gold action.
2. Pain — loss aversion: what a slow reply costs.
3. Mechanism — three steps with photos.
4. Proof — the real pipeline UI on navy.
5. Risk removal — data isolation, control, audit, roles; FAQ answers objections.
6. One action — the same gold button, repeated.

## Tokens

All colours live in `apps/web/src/app/globals.css` (`@theme`). Token names from Phase 1 are kept
(`brand` = navy, `attention` = gold) so every screen re-themed at once. Text/background pairs meet
WCAG 2.2 AA.

## Photography

`apps/web/src/lib/images.ts` lists every photo (Unsplash licence: free for commercial use). Swap a
photo by changing its ID. For on-prem or offline installs: `pnpm --filter @rea/web images:download`
then `NEXT_PUBLIC_SELF_HOSTED_IMAGES=true`. If a photo ever fails to load, a navy gradient shows instead.
