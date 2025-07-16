const { Ollama } = require('ollama');

const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://host.docker.internal:11434';
const ollamaClient = new Ollama({ host: OLLAMA_HOST });

const RESUME_JOB_EVALUATION_SYSTEM_PROMPT = `
You are a helpful assistant that evaluates how well a resume matches a job offer.
You will receive two input strings:
* 'resume': a plain-text resume (may include skills, experience, education, certifications, etc.)
* 'jobOffer': a plain-text job offer (may include responsibilities, required and preferred qualifications, skills, etc.)
Your task is to:
1. Analyze the resume and job offer to determine how well they align.
2. Return a JSON object with two fields:
   * "score": an integer from 0 to 100 indicating how closely the resume matches the job offer (higher is better).
   * "reason": a concise explanation of why the score was given, highlighting key matches and mismatches (e.g., missing skills, years of experience, education mismatch, strong alignment, etc.)
IMPORTANT: Your response MUST be ONLY a valid JSON object. DO NOT include any other text, preambles, conversational elements, or markdown (like \`\`\`json). Just the raw JSON object.
`;

async function generateText(prompt, model = 'llama3') { /* ... */ }

async function evaluateResumeJobOffer(resumeContent, jobOfferContent, model = 'llama3') {
  const userPrompt = `
  Here is the resume:
  ---
  ${resumeContent}
  ---

  Here is the job offer:
  ---
  ${jobOfferContent}
  ---

  Please evaluate the match and provide your response as a JSON object with "score" and "reason" fields, exactly as specified in the system prompt.
  `;

  try {
    const response = await ollamaClient.chat({
      model: model,
      messages: [
        { role: 'system', content: RESUME_JOB_EVALUATION_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt }
      ],
      stream: false,
    });

    const ollamaOutput = response.message.content;
    console.log('Ollama raw output:', ollamaOutput);

    let jsonString = ollamaOutput;
    const jsonStartIndex = ollamaOutput.indexOf('{');
    const jsonEndIndex = ollamaOutput.lastIndexOf('}');

    if (jsonStartIndex !== -1 && jsonEndIndex !== -1 && jsonEndIndex > jsonStartIndex) {
      jsonString = ollamaOutput.substring(jsonStartIndex, jsonEndIndex + 1);
    } else {
      throw new Error('Could not find a valid JSON object in Ollama\'s response.');
    }

    try {
      const parsedOutput = JSON.parse(jsonString);
      if (typeof parsedOutput.score !== 'number' || typeof parsedOutput.reason !== 'string') {
        throw new Error('Ollama response is not in the expected JSON format (missing score or reason).');
      }
      return parsedOutput;
    } catch (jsonError) {
      console.error('Error parsing extracted JSON from Ollama output:', jsonError);
      throw new Error(`Ollama did not return valid JSON or expected fields. Extracted string: ${jsonString.substring(0, 200)}... Raw output: ${ollamaOutput.substring(0, 200)}...`);
    }

  } catch (error) {
    console.error(`Error evaluating resume/job offer with Ollama (${OLLAMA_HOST}) for model ${model}:`, error);
    throw new Error(`Failed to evaluate match: ${error.message}`);
  }
}

module.exports = {
  generateText,
  evaluateResumeJobOffer,
};