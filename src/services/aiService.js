const API_URL = import.meta.env.VITE_API_URL || '/api/ai';

export const initAI = () => {
  // In MERN, the configuration happens on the backend.
  // We return true if we have a backend URL to talk to.
  return typeof API_URL === 'string';
};

export const analyzeResume = async (resumeText, jobDescription) => {
  try {
    const response = await fetch(`${API_URL}/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ resumeText, jobDescription }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to analyze resume.');
    }

    const data = await response.json();
    // Save the ID for subsequent cover letter generation if available
    if (data.id) {
      localStorage.setItem('lastAnalysisId', data.id);
    }
    return data;
  } catch (error) {
    console.error('Error in analyzeResume:', error);
    throw error;
  }
};

export const generateCoverLetter = async (resumeText, jobDescription) => {
  try {
    const analysisId = localStorage.getItem('lastAnalysisId');
    const response = await fetch(`${API_URL}/cover-letter`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ resumeText, jobDescription, analysisId }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to generate cover letter.');
    }

    const data = await response.json();
    return data.coverLetter;
  } catch (error) {
    console.error('Error in generateCoverLetter:', error);
    throw error;
  }
};
