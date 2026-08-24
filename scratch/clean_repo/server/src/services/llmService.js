const { GoogleGenerativeAI } = require('@google/generative-ai');

function getGenerativeModel() {
	const apiKey = process.env.GEMINI_API_KEY;
	const modelName = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

	if (!apiKey || apiKey === 'your_gemini_api_key' || apiKey === 'your_openai_api_key') {
		return null;
	}

	const genAI = new GoogleGenerativeAI(apiKey);
	return genAI.getGenerativeModel({ model: modelName });
}

/**
 * Generates pre-visit summary from patient symptoms
 */
async function generatePreVisitSummary(symptomsText) {
	const prompt = `Analyse these symptoms and return a valid JSON object with keys: "urgencyLevel" ("Low" / "Medium" / "High"), "chiefComplaint" (string), and "suggestedQuestions" (array of three strings for the doctor). Symptoms: ${symptomsText}`;

	const defaultFallback = {
		urgencyLevel: 'MEDIUM',
		chiefComplaint: (symptomsText && symptomsText.slice(0, 100)) || 'General discomfort',
		suggestedQuestions: [
			'How long have you been experiencing these symptoms?',
			'Have you tried any over-the-counter medications?',
			'Do these symptoms worsen at any specific time of day?'
		]
	};

	try {
		const model = getGenerativeModel();
		if (!model) {
			return defaultFallback;
		}

		const result = await model.generateContent({
			contents: [{ role: 'user', parts: [{ text: prompt }] }],
			generationConfig: {
				temperature: 0.2,
				responseMimeType: 'application/json',
			},
		});

		const responseText = result.response.text().replace(/```json|```/g, '').trim();
		const parsed = JSON.parse(responseText);

		let urgency = (parsed.urgencyLevel || 'MEDIUM').toUpperCase();
		if (!['LOW', 'MEDIUM', 'HIGH'].includes(urgency)) urgency = 'MEDIUM';

		return {
			urgencyLevel: urgency,
			chiefComplaint: parsed.chiefComplaint || symptomsText,
			suggestedQuestions: parsed.suggestedQuestions || ['Could you elaborate on the onset of symptoms?']
		};
	} catch (error) {
		console.error('LLM Pre-visit summary generation failed, using fallback:', error.message);
		return defaultFallback;
	}
}

const {
	PostVisitSummarySchema,
	getPostVisitFallback,
	validateSourceGrounding,
} = require('../utils/postVisitGuardrail');

/**
 * Generates post-visit summary from doctor clinical notes with strict anti-hallucination guardrail
 */
async function generatePostVisitSummary(notesText, prescription = null) {
	const cleanNotes = (notesText && String(notesText).trim()) || '';
	if (!cleanNotes) {
		console.log('[AI Observability] Empty notes provided, returning default fallback without invoking Gemini API');
		return getPostVisitFallback(notesText);
	}

	const startTime = Date.now();
	const defaultFallback = getPostVisitFallback(notesText);

	try {
		const model = getGenerativeModel();
		if (!model) {
			console.log('[AI Observability] Gemini model not configured, using fallback');
			return defaultFallback;
		}

		const prompt = `You are a clinical documentation summarization assistant.
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
}`;

		const result = await model.generateContent({
			contents: [{ role: 'user', parts: [{ text: prompt }] }],
			generationConfig: {
				temperature: 0.2,
				responseMimeType: 'application/json',
			},
		});

		const responseText = result.response.text().replace(/```json|```/g, '').trim();
		const rawParsed = JSON.parse(responseText);

		// 1. Zod Schema Validation
		const schemaValidation = PostVisitSummarySchema.safeParse(rawParsed);
		if (!schemaValidation.success) {
			console.error('[AI Observability] Post-visit summary Zod schema validation failed. Latency:', Date.now() - startTime, 'ms');
			return defaultFallback;
		}

		// 2. Source-Grounding Validation
		const groundingResult = validateSourceGrounding(schemaValidation.data, cleanNotes, prescription);
		if (!groundingResult.valid) {
			console.error('[AI Observability] Post-visit summary source grounding failed:', groundingResult.reason, '. Latency:', Date.now() - startTime, 'ms');
			return defaultFallback;
		}

		console.log('[AI Observability] Post-visit summary generated and validated successfully. Latency:', Date.now() - startTime, 'ms');
		return groundingResult.data;
	} catch (error) {
		console.error('[AI Observability] Post-visit summary generation failed, using fallback:', error.message, '. Latency:', Date.now() - startTime, 'ms');
		return defaultFallback;
	}
}

module.exports = {
	generatePreVisitSummary,
	generatePostVisitSummary,
};
