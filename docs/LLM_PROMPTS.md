# CareConnect AI / LLM Integration & Prompts Reference

CareConnect integrates **Google Gemini AI** (`@google/generative-ai`) to provide automated clinical symptom triage before appointments and patient-friendly consultation summaries after visits.

---

## 1. Pre-Visit AI Symptom Triage

### Purpose
Analyzes patient-submitted symptoms before an appointment to generate a structured diagnostic summary for the attending doctor, including urgency classification and suggested clinical inquiry questions.

### Exact Verbatim Prompt (`server/src/services/llmService.js`):
```text
Analyse these symptoms and return a valid JSON object with keys: "urgencyLevel" ("Low" / "Medium" / "High"), "chiefComplaint" (string), and "suggestedQuestions" (array of three strings for the doctor). Symptoms: ${symptomsText}
```

### Response Schema & Sanitization
The model output is parsed as JSON with temperature `0.2` and validated to enforce uppercase urgency levels (`LOW`, `MEDIUM`, `HIGH`):

```json
{
  "urgencyLevel": "MEDIUM",
  "chiefComplaint": "High fever, persistent cough, and body ache for 3 days",
  "suggestedQuestions": [
    "How long have you been experiencing these symptoms?",
    "Have you tried any over-the-counter fever reducers?",
    "Are you experiencing any shortness of breath or chest pain?"
  ]
}
```

---

## 2. Post-Visit AI Clinical Summary

### Purpose
Converts doctor clinical notes and digital prescriptions into patient-friendly summaries with dosage instructions and follow-up guidance.

### Exact Verbatim Prompt (`server/src/services/llmService.js`):
```text
You are a clinical documentation summarization assistant.
Your task is to summarize the doctor's supplied clinical information.
You are NOT allowed to diagnose the patient.
You are NOT allowed to infer missing information.
You are NOT allowed to recommend medications or treatments.
You are NOT allowed to create medical facts that are not present in the source.
Every diagnosis, medication, test, warning, and follow-up instruction must be directly supported by the supplied doctor documentation.
If information is missing, return an empty array or "Not specified by the doctor."
Do not use general medical knowledge to fill gaps.

Clinical Notes: "${cleanNotes}"
Prescription Details: ${JSON.stringify(prescription || {})}

Return a JSON object matching this schema:
{
  "summary": "Patient-friendly summary based strictly on doctor notes",
  "diagnosis": ["Only explicitly stated diagnoses"],
  "medications": [{"name": "Medication name", "dosage": "dosage or null", "frequency": "frequency or null", "duration": "duration or null"}],
  "tests": ["Only explicitly stated tests"],
  "followUp": "Explicit follow-up or 'Not specified by the doctor.'",
  "warnings": ["Only explicitly stated warnings"]
}
```

---

## 3. Zod Output Contract Schema (`PostVisitSummarySchema`)

Before processing AI outputs, raw JSON is validated against strict Zod type constraints (`server/src/utils/postVisitGuardrail.js`):

```javascript
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
```

---

## 4. Anti-Hallucination & Source Grounding Guardrail (`validateSourceGrounding`)

To ensure absolute patient safety and medical accuracy, AI outputs pass through a deterministic source-grounding validator (`postVisitGuardrail.js`):

1. **Searchable Source Extraction**: Concatenates raw clinical notes and prescription medicines into a normalized search string.
2. **Entity Grounding Verification**: Checks every diagnosis, medication name, test item, and warning against the searchable source text.
3. **Unstated Fact Detection**: If the LLM introduces an unstated medication, diagnosis, or follow-up instruction, the summary is flagged with `needsHumanReview = true` and `reviewReasons` logged.
4. **Follow-Up Sanitization**: Unsupported follow-up claims are automatically sanitized to `"Not specified by the doctor."`.

---

## 5. Failure Handling & Graceful Fallbacks

The system never crashes or blocks booking/consultation workflows due to AI service failures:

| Failure Scenario | Guardrail / Fallback Behavior |
| :--- | :--- |
| **Missing `GEMINI_API_KEY`** | Detects unset key on startup. Returns deterministic default fallback immediately without network calls. |
| **Network Timeout / API Error** | Catches exception silently and returns fallback pre-visit or post-visit summary object. |
| **Invalid JSON Output** | Catches `JSON.parse` failure, logs warning, and activates default fallback. |
| **Zod Schema Mismatch** | Schema validation failure triggers fallback response. |
| **Hallucination Detection** | Flags summary for doctor review (`needsHumanReview = true`) and sanitizes invalid fields. |
