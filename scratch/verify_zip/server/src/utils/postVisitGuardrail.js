const { z } = require('zod');

// 1. Output Contract Schema via Zod
const MedicationItemSchema = z.object({
  name: z.string(),
  dosage: z.string().nullable().optional(),
  frequency: z.string().nullable().optional(),
  duration: z.string().nullable().optional(),
});

const PostVisitSummarySchema = z.object({
  summary: z.string(),
  diagnosis: z.array(z.string()),
  medications: z.array(MedicationItemSchema),
  tests: z.array(z.string()),
  followUp: z.string(),
  warnings: z.array(z.string()),
});

// Helper for text normalization (lowercase, remove punctuation, collapse whitespace)
function normalizeText(str) {
  if (!str) return '';
  return String(str)
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Generate deterministic fallback response
function getPostVisitFallback(notesText) {
  const cleanNotes = (notesText && String(notesText).trim()) || '';
  if (!cleanNotes) {
    return {
      summary: 'No clinical summary was provided by the doctor.',
      diagnosis: [],
      medications: [],
      tests: [],
      followUp: 'Not specified by the doctor.',
      warnings: [],
    };
  }
  return {
    summary: 'The doctor has completed the consultation. Please review the clinical notes provided by your doctor.',
    diagnosis: [],
    medications: [],
    tests: [],
    followUp: 'Not specified by the doctor.',
    warnings: [],
  };
}

// Extract full searchable source text from clinical notes and prescription
function buildSearchableSource(notesText, prescription) {
  let source = normalizeText(notesText);

  if (prescription && typeof prescription === 'object') {
    if (prescription.diagnosis) {
      source += ' ' + normalizeText(prescription.diagnosis);
    }
    if (prescription.followUpInstructions) {
      source += ' ' + normalizeText(prescription.followUpInstructions);
    }
    if (Array.isArray(prescription.medicines)) {
      prescription.medicines.forEach((med) => {
        if (med && typeof med === 'object') {
          source += ' ' + normalizeText(med.name);
          source += ' ' + normalizeText(med.dosage);
          source += ' ' + normalizeText(med.frequency);
          source += ' ' + normalizeText(med.duration);
        }
      });
    }
  }

  return source;
}

// Source-Grounding Anti-Hallucination Validation Engine
function validateSourceGrounding(aiOutput, notesText, prescription) {
  const searchableSource = buildSearchableSource(notesText, prescription);

  // If no source text exists, return fallback immediately
  if (!searchableSource || searchableSource.trim() === '') {
    return { valid: false, reason: 'Empty source text' };
  }

  const reviewReasons = [];

  // 1. Validate Diagnoses: Every diagnosis in AI output must be grounded in source text
  if (Array.isArray(aiOutput.diagnosis)) {
    for (const diag of aiOutput.diagnosis) {
      const normDiag = normalizeText(diag);
      if (normDiag && !searchableSource.includes(normDiag)) {
        const words = normDiag.split(' ').filter((w) => w.length > 2);
        const supported = words.some((w) => searchableSource.includes(w));
        if (!supported) {
          reviewReasons.push(`Hallucinated diagnosis detected: "${diag}"`);
        }
      }
    }
  }

  // 2. Validate Medications: Every medication name in AI output must be grounded in source text
  if (Array.isArray(aiOutput.medications)) {
    for (const med of aiOutput.medications) {
      if (med && med.name) {
        const normMedName = normalizeText(med.name);
        if (normMedName && !searchableSource.includes(normMedName)) {
          const medWords = normMedName.split(' ').filter((w) => w.length >= 3);
          const supported = medWords.some((w) => searchableSource.includes(w) || searchableSource.includes(w.slice(0, 4)));
          if (!supported) {
            reviewReasons.push(`Hallucinated medication detected: "${med.name}"`);
          }
        }
      }
    }
  }

  // 3. Validate Tests: Every test mentioned in AI output must be in source text
  if (Array.isArray(aiOutput.tests)) {
    for (const testItem of aiOutput.tests) {
      const normTest = normalizeText(testItem);
      if (normTest && !searchableSource.includes(normTest)) {
        reviewReasons.push(`Hallucinated test detected: "${testItem}"`);
      }
    }
  }

  // 4. Validate Warnings: Every warning in AI output must be in source text
  if (Array.isArray(aiOutput.warnings)) {
    for (const warn of aiOutput.warnings) {
      const normWarn = normalizeText(warn);
      if (normWarn && !searchableSource.includes(normWarn)) {
        reviewReasons.push(`Hallucinated warning detected: "${warn}"`);
      }
    }
  }

  // 5. Validate & Sanitize Follow-Up: If follow-up in AI output is not supported by source text, flag for review
  let sanitizedFollowUp = aiOutput.followUp || 'Not specified by the doctor.';
  if (aiOutput.followUp && aiOutput.followUp !== 'Not specified by the doctor.') {
    const normFollowUp = normalizeText(aiOutput.followUp);
    if (normFollowUp && !searchableSource.includes(normFollowUp)) {
      const followUpWords = normFollowUp.split(' ').filter((w) => w.length > 2);
      const isPartiallyGrounded = followUpWords.some((word) => searchableSource.includes(word));

      if (!isPartiallyGrounded) {
        reviewReasons.push(`Unstated follow-up instruction detected: "${aiOutput.followUp}"`);
        sanitizedFollowUp = 'Not specified by the doctor.';
      }
    }
  }

  const needsHumanReview = reviewReasons.length > 0;

  return {
    valid: true,
    needsHumanReview,
    reviewReasons,
    data: {
      ...aiOutput,
      followUp: sanitizedFollowUp,
      needsHumanReview,
      reviewReasons,
    },
  };
}

module.exports = {
  PostVisitSummarySchema,
  normalizeText,
  getPostVisitFallback,
  validateSourceGrounding,
};
