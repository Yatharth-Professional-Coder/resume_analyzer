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
  let targetModel = "gemini-3.1-flash-lite";
  let attemptCount = 0;

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

  while (attemptCount < 2) {
    try {
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
      const errMsg = error.message || "";
      console.error(`AI Attempt ${attemptCount + 1} failed for model ${targetModel}:`, errMsg);
      
      const isQuotaError = errMsg.includes('429') || errMsg.includes('quota') || errMsg.includes('limit') || errMsg.includes('rate');
      const isNotFoundError = errMsg.includes('404') || errMsg.includes('not found') || errMsg.includes('unsupported');
      const isServiceError = errMsg.includes('503') || errMsg.includes('demand') || errMsg.includes('temporary') || errMsg.includes('retry');

      if (attemptCount === 0 && (isQuotaError || isNotFoundError || isServiceError)) {
        try {
          console.log("!!! TRIGGERING AUTO-FALLBACK SERVICE !!!");
          // Dynamically fetch models from Google API
          const fetchRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
          const data = await fetchRes.json();
          
          if (data.models && data.models.length > 0) {
            const availableModels = data.models
              .map(m => m.name.replace('models/', ''))
              .filter(name => name.includes('gemini'));
            
            // Prioritize the models based on the table provided by the user
            const fallback = availableModels.find(m => m.includes('3.1-flash-lite') && m !== targetModel)
                            || availableModels.find(m => m.includes('3-flash') && m !== targetModel)
                            || availableModels.find(m => m.includes('2.5-flash') && m !== targetModel)
                            || availableModels.find(m => m !== targetModel);
            
            if (fallback) {
              console.log(`>>> AUTO-SWITCHING FROM ${targetModel} TO ${fallback} <<<`);
              targetModel = fallback;
              attemptCount++;
              continue;
            }
          }
        } catch (e) {
          console.error("Critical failure during fallback discovery:", e.message);
        }
      }
      return res.status(500).json({ error: error.message || "AI Analysis failed." });
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
  let targetModel = "gemini-3.1-flash-lite";
  let attemptCount = 0;

  const prompt = `
  ${getSystemInstruction()}
  Task: Write a professional cover letter (max 300 words).
  Resume: """${resumeText}"""
  Job Description: """${jobDescription}"""
  `;

  while (attemptCount < 2) {
    try {
      const model = genAI.getGenerativeModel({ model: targetModel });
      const result = await model.generateContent(prompt);
      const coverLetter = result.response.text();

      // Update analysis in MongoDB with cover letter if ID exists
      if (analysisId) {
        await Analysis.findByIdAndUpdate(analysisId, { coverLetter });
      }

      return res.json({ coverLetter });
    } catch (error) {
      const errMsg = error.message || "";
      console.error(`AI Attempt ${attemptCount + 1} failed for model ${targetModel}:`, errMsg);

      const isQuotaError = errMsg.includes('429') || errMsg.includes('quota') || errMsg.includes('limit') || errMsg.includes('rate');
      const isNotFoundError = errMsg.includes('404') || errMsg.includes('not found') || errMsg.includes('unsupported');
      const isServiceError = errMsg.includes('503') || errMsg.includes('demand') || errMsg.includes('temporary') || errMsg.includes('retry');

      if (attemptCount === 0 && (isQuotaError || isNotFoundError || isServiceError)) {
        try {
          const fetchRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
          const data = await fetchRes.json();
          if (data.models) {
            const availableModels = data.models
              .map(m => m.name.replace('models/', ''))
              .filter(name => name.includes('gemini'));
            
             const fallback = availableModels.find(m => m.includes('3.1-flash-lite') && m !== targetModel) 
                            || availableModels.find(m => m.includes('3-flash') && m !== targetModel)
                            || availableModels.find(m => m.includes('2.5-flash') && m !== targetModel)
                            || availableModels.find(m => m !== targetModel);

            if (fallback) {
              console.log(`>>> AUTO-SWITCHING FROM ${targetModel} TO ${fallback} <<<`);
              targetModel = fallback;
              attemptCount++;
              continue;
            }
          }
        } catch (e) {}
      }
      return res.status(500).json({ error: errMsg || "Cover Letter generation failed." });
    }
  }
};

module.exports = { analyzeResume, generateCoverLetter };
