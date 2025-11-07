/**
 * System and user prompts for Claude Sonnet 4.5 synthesis.
 * Enforces citation-first, educational-only approach.
 */

import type { Study, EvidenceGrade } from '@peptalk/schemas'

/**
 * System prompt for Claude Sonnet 4.5.
 * Sets the rules and context for synthesis.
 */
export const SYSTEM_PROMPT = `You are an evidence-synthesis writer for a peptides reference platform.

CRITICAL RULES:
1. Educational content only. Never provide medical advice, dosing recommendations, or procurement guidance.
2. Every empirical claim MUST cite a PMID or NCT inline (e.g., "improved healing [PMID:12345678]").
3. Use "reported" language, never "recommended" (e.g., "Studies reported..." not "We recommend...").
4. Distinguish human vs animal evidence clearly in separate sections.
5. Present conflicting findings honestly; do not cherry-pick results.
6. HTML output only: <p>, <ul>, <li>, <strong>, <em> tags.
7. No speculative claims beyond what studies directly show.

OUTPUT STRUCTURE:
- Summary paragraph (2-3 sentences, high-level overview with key findings)
- Human Research section (if human studies exist)
- Animal Research section (if animal studies exist)
- Mechanisms section (how it works, if known)
- Safety & Side Effects section (adverse events reported)

NOTE: You will generate technical content only. Plain-language summaries will be added in a separate pass.

CITATION FORMAT:
- PubMed: [PMID:12345678]
- ClinicalTrials: [NCT:NCT01234567]

Always cite inline, never in footnotes or references section.

TONE:
- Professional, objective, factual
- No marketing language or hype
- Present limitations and gaps in evidence
- Neutral on efficacy (let evidence speak)`

/**
 * Generate user prompt for synthesis.
 */
export function generateUserPrompt(
  peptideName: string,
  aliases: string[],
  studies: Study[],
  evidenceGrade: EvidenceGrade
): string {
  const aliasText = aliases.length > 0 ? ` (also known as: ${aliases.join(', ')})` : ''

  const humanStudies = studies.filter((s) => s.studyType.startsWith('human_'))
  const animalStudies = studies.filter((s) => s.studyType.startsWith('animal_'))

  let prompt = `Synthesize evidence for ${peptideName}${aliasText}.

Evidence Grade: ${evidenceGrade.toUpperCase()}
Total Studies: ${studies.length} (${humanStudies.length} human, ${animalStudies.length} animal)

`

  // Add human studies
  if (humanStudies.length > 0) {
    prompt += `HUMAN STUDIES (${humanStudies.length}):\n\n`

    for (const study of humanStudies) {
      prompt += formatStudy(study)
    }

    prompt += '\n'
  }

  // Add animal studies
  if (animalStudies.length > 0) {
    prompt += `ANIMAL STUDIES (${animalStudies.length}):\n\n`

    for (const study of animalStudies) {
      prompt += formatStudy(study)
    }

    prompt += '\n'
  }

  prompt += `TASK:
Write HTML content following the output structure in the system prompt.
Include summary + sections for human research, animal research, mechanisms, and safety.
Cite every empirical claim with [PMID:xxx] or [NCT:xxx].
Be honest about evidence limitations.
Use only <p>, <ul>, <li>, <strong>, <em>, <h2> tags.

OUTPUT FORMAT:
Start with a summary paragraph (no heading).
Then structure each section as:
<h2>[Section Title]</h2>
[Technical HTML content with inline citations]

Example:
<p>Summary paragraph here with key findings [PMID:12345678].</p>

<h2>Human Research</h2>
<p>Technical content about human studies [PMID:98765432]...</p>

<h2>Animal Research</h2>
<p>Technical content about animal studies [PMID:11111111]...</p>`

  return prompt
}

/**
 * Format study for inclusion in prompt.
 */
function formatStudy(study: Study): string {
  let formatted = ''

  if (study.type === 'pubmed') {
    formatted += `[PMID:${study.pmid}] ${study.title}\n`
    formatted += `Type: ${study.studyType}\n`
    formatted += `Journal: ${study.journal} (${study.year})\n`
    if (study.abstract) {
      formatted += `Abstract: ${study.abstract}\n`
    }
  } else if (study.type === 'clinicaltrials') {
    formatted += `[NCT:${study.nctId}] ${study.title}\n`
    formatted += `Type: ${study.studyType}\n`
    formatted += `Status: ${study.status}\n`
    if (study.phase) formatted += `Phase: ${study.phase}\n`
    formatted += `Conditions: ${study.conditions.join(', ')}\n`
    formatted += `Interventions: ${study.interventions.join(', ')}\n`
    if (study.enrollment) formatted += `Enrollment: ${study.enrollment}\n`
  }

  formatted += '\n'

  return formatted
}
