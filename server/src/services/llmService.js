const OpenAI = require('openai');

const openai = new OpenAI({
	apiKey: process.env.OPENAI_API_KEY || 'mock-key',
});

/**
 * Generates pre-visit summary from patient symptoms
 */
async function generatePreVisitSummary(symptomsText) {
	const prompt = `Analyse these symptoms and return a valid JSON object with keys: urgency level ("Low" / "Medium" / "High"), chief complaint (string), and suggested questions (array of three strings for the doctor). Symptoms: ${symptomsText}`;

	try {
		// If API key is missing or set to mock, return a safe fallback structure
		if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here') {
			return {
				urgencyLevel: 'MEDIUM',
				chiefComplaint: symptomsText.slice(0, 100) || 'General discomfort',
				suggestedQuestions: [
					'How long have you been experiencing these symptoms?',
					'Have you tried any over-the-counter medications?',
					'Do these symptoms worsen at any specific time of day?'
				]
			};
		}

		const response = await openai.chat.completions.create({
			model: 'gpt-3.5-turbo',
			messages: [{ role: 'user', content: prompt }],
			temperature: 0.3,
			response_format: { type: 'json_object' }
		});

		const result = JSON.parse(response.choices[0].message.content);

		// Normalize urgency level to match Prisma Enum (LOW, MEDIUM, HIGH)
		let urgency = (result.urgencyLevel || 'MEDIUM').toUpperCase();
		if (!['LOW', 'MEDIUM', 'HIGH'].includes(urgency)) urgency = 'MEDIUM';

		return {
			urgencyLevel: urgency,
			chiefComplaint: result.chiefComplaint || symptomsText,
			suggestedQuestions: result.suggestedQuestions || ['Could you elaborate on the onset of symptoms?']
		};
	} catch (error) {
		console.error('LLM Pre-visit summary generation failed, using fallback:', error.message);
		// Graceful fallback on LLM failure
		return {
			urgencyLevel: 'MEDIUM',
			chiefComplaint: symptomsText.slice(0, 100) || 'Patient reported symptoms',
			suggestedQuestions: [
				'Can you describe when the symptoms started?',
				'Are there any aggravating factors?',
				'Have you noticed any related changes?'
			]
		};
	}
}

/**
 * Generates post-visit summary from doctor clinical notes
 */
async function generatePostVisitSummary(notesText) {
	const prompt = `Convert these clinical notes into a patient-friendly summary with medication schedule and follow-up steps: ${notesText}`;

	try {
		if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here') {
			return `Summary: Your consultation was completed successfully.\n\nNotes: ${notesText}\n\nPlease follow the prescribed medication schedule and consult again if symptoms persist.`;
		}

		const response = await openai.chat.completions.create({
			model: 'gpt-3.5-turbo',
			messages: [{ role: 'user', content: prompt }],
			temperature: 0.3,
		});

		return response.choices[0].message.content;
	} catch (error) {
		console.error('LLM Post-visit summary generation failed, using fallback:', error.message);
		// Graceful fallback
		return `Consultation Summary:\n${notesText}\n\n(Note: Generated via default fallback due to temporary AI service unavailability).`;
	}
}

module.exports = {
	generatePreVisitSummary,
	generatePostVisitSummary,
};
