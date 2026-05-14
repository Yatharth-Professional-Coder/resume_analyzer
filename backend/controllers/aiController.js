const { GoogleGenerativeAI } = require("@google/generative-ai");
const Groq = require("groq-sdk");
const Analysis = require("../models/Analysis");

/**
 * System instruction for the AI
 */
const getSystemInstruction = () => {
  return `You are an expert ATS (Applicant Tracking System) parser and career coach. Your goal is to help candidates optimize their resumes. 
  Output your responses strictly in the requested format. Do not include any introductory or concluding text.`;
};

/**
 * Unified AI call with fallback (Groq -> Gemini)
 */
const getAICompletion = async (prompt, isJson = false) => {
  const groqKey = process.env.GROQ_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  // 1. Try Groq first (Fast & Free)
  if (groqKey) {
    try {
      console.log("Attempting AI call with Groq (Llama 3.1 70B)...");
      const groq = new Groq({ apiKey: groqKey });
      const chatCompletion = await groq.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: "llama-3.1-70b-versatile",
        response_format: isJson ? { type: "json_object" } : undefined,
      });

      return chatCompletion.choices[0].message.content;
    } catch (error) {
      console.error("Groq AI failed:", error.message);
      if (!geminiKey) throw error;
      console.log("Falling back to Gemini...");
    }
  }

  // 2. Fallback to Gemini
  if (geminiKey) {
    try {
      console.log("Attempting AI call with Gemini 1.5 Flash...");
      const genAI = new GoogleGenerativeAI(geminiKey);
      const model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash",
        generationConfig: isJson ? { responseMimeType: "application/json" } : undefined
      });

      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      console.error("Gemini AI failed:", error.message);
      throw error;
    }
  }

  throw new Error("No AI API keys configured (Groq or Gemini).");
};

const analyzeResume = async (req, res) => {
  const { resumeText, jobDescription } = req.body;

  const prompt = `
  ${getSystemInstruction()}
  Task: Analyze the resume against the job description. Provide an ATS score (0-100), found keywords, missing keywords, and 3-5 specific improvements.
  
  Resume: """${resumeText}"""
  Job Description: """${jobDescription}"""
  
  Respond ONLY with a JSON object in this format:
  {
    "atsScore": number,
    "foundKeywords": ["word1", "word2"],
    "missingKeywords": ["word3", "word4"],
    "improvements": ["improvement1", "improvement2"]
  }
  `;

  try {
    const rawResponse = await getAICompletion(prompt, true);
    const cleanedText = rawResponse.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim();
    const analysis = JSON.parse(cleanedText);

    // Save to MongoDB
    const analysisData = new Analysis({
      resumeText,
      jobDescription,
      ...analysis
    });
    
    const savedAnalysis = await analysisData.save();
    return res.json({ ...analysis, id: savedAnalysis._id });

  } catch (error) {
    console.error("AI Analysis process failed:", error.message);
    return res.status(500).json({ 
      error: "AI service error", 
      details: error.message 
    });
  }
};

const generateCoverLetter = async (req, res) => {
  const { resumeText, jobDescription, analysisId } = req.body;

  const prompt = `
  ${getSystemInstruction()}
  Task: Write a professional, concise cover letter (max 300 words) based on the resume and job description.
  Resume: """${resumeText}"""
  Job Description: """${jobDescription}"""
  
  Respond only with the cover letter text in markdown format.
  `;

  try {
    const coverLetter = await getAICompletion(prompt, false);

    // Update analysis in MongoDB if ID exists
    if (analysisId) {
      await Analysis.findByIdAndUpdate(analysisId, { coverLetter });
    }

    return res.json({ coverLetter });
  } catch (error) {
    console.error("Cover Letter generation failed:", error.message);
    return res.status(500).json({ 
      error: "Cover Letter service error", 
      details: error.message 
    });
  }
};

module.exports = { analyzeResume, generateCoverLetter };
