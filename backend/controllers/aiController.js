const { GoogleGenerativeAI } = require("@google/generative-ai");
const Analysis = require("../models/Analysis");

const getSystemInstruction = () => {
  return `You are an expert ATS (Applicant Tracking System) parser, career coach, and professional resume writer. Your goal is to help candidates optimize their resumes to match a specific job description and to generate tailored cover letters. Output your responses strictly in formatting that can be displayed nicely (use markdown formatting appropriately, but don't wrap the entire response in markdown code blocks unless requested).`;
};

const analyzeResume = async (req, res) => {
  const { resumeText, jobDescription } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: "Gemini API Key not configured on server." });
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  
  // Prioritized list of models to try
  const modelsToTry = [
    "gemini-1.5-flash",
    "gemini-1.5-flash-8b",
    "gemini-1.5-pro"
  ];

  const prompt = `
  ${getSystemInstruction()}
  Task: Analyze the candidate's resume against the target job description. Generate a comprehensive ATS analysis.
  
  Resume:
  """${resumeText}"""
  
  Job Description:
  """${jobDescription}"""
  
  Please provide exactly three things in the following JSON format.
  {
    "atsScore": 85,
    "foundKeywords": ["React", "JavaScript"],
    "missingKeywords": ["GraphQL"],
    "improvements": ["Detail your achievements."]
  }
  `;

  for (let i = 0; i < modelsToTry.length; i++) {
    const targetModel = modelsToTry[i];
    try {
      console.log(`Attempting AI Analysis with model: ${targetModel} (Attempt ${i + 1})`);
      const model = genAI.getGenerativeModel({ 
        model: targetModel,
        generationConfig: { responseMimeType: "application/json" }
      });

      const result = await model.generateContent(prompt);
      let text = result.response.text();
      text = text.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim();
      const analysis = JSON.parse(text);

      // Save to MongoDB
      const analysisData = new Analysis({
        resumeText,
        jobDescription,
        ...analysis
      });
      
      const savedAnalysis = await analysisData.save();
      return res.json({ ...analysis, id: savedAnalysis._id });

    } catch (error) {
      console.error(`AI Error with ${targetModel}:`, error.message);
      
      // If this was our last model, return the error
      if (i === modelsToTry.length - 1) {
        return res.status(500).json({ 
          error: "AI Analysis failed after trying multiple models.", 
          details: error.message 
        });
      }
      
      // Otherwise, continue to the next model in the list
      console.log(`>>> FALLING BACK TO NEXT MODEL... <<<`);
    }
  }
};

const generateCoverLetter = async (req, res) => {
  const { resumeText, jobDescription, analysisId } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: "Gemini API Key not configured on server." });
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  
  const modelsToTry = [
    "gemini-1.5-flash",
    "gemini-1.5-flash-8b",
    "gemini-1.5-pro"
  ];

  const prompt = `
  ${getSystemInstruction()}
  Task: Write a professional cover letter (max 300 words).
  Resume: """${resumeText}"""
  Job Description: """${jobDescription}"""
  `;

  for (let i = 0; i < modelsToTry.length; i++) {
    const targetModel = modelsToTry[i];
    try {
      console.log(`Attempting Cover Letter with model: ${targetModel} (Attempt ${i + 1})`);
      const model = genAI.getGenerativeModel({ model: targetModel });
      const result = await model.generateContent(prompt);
      const coverLetter = result.response.text();

      // Update analysis in MongoDB with cover letter if ID exists
      if (analysisId) {
        await Analysis.findByIdAndUpdate(analysisId, { coverLetter });
      }

      return res.json({ coverLetter });

    } catch (error) {
      console.error(`AI Error with ${targetModel}:`, error.message);
      
      if (i === modelsToTry.length - 1) {
        return res.status(500).json({ 
          error: "Cover Letter generation failed after trying multiple models.", 
          details: error.message 
        });
      }
      
      console.log(`>>> FALLING BACK TO NEXT MODEL... <<<`);
    }
  }
};

module.exports = { analyzeResume, generateCoverLetter };
