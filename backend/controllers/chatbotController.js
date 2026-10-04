const { GoogleGenerativeAI } = require('@google/generative-ai');
const ChatLog = require('../models/ChatLog');
const OPD = require('../models/OPD');
const User = require('../models/User');
const { generateId } = require('../utils/id');

// @desc    Suggest OPD using Patient Profile & Gemini AI (Structured JSON + Fast Emergency Override)
// @route   POST /api/chatbot/suggest
// @access  Authenticated / Public
exports.suggestOpd = async (req, res) => {
  try {
    const { symptom, language = 'en' } = req.body;
    
    if (!symptom || typeof symptom !== 'string' || !symptom.trim()) {
      return res.status(400).json({ success: false, message: 'Please describe your symptoms clearly' });
    }

    const textLower = symptom.toLowerCase();

    // ---------------------------------------------------------
    // 1. FAST EMERGENCY OVERRIDE RULE ENGINE (Instant ETU Alert)
    // ---------------------------------------------------------
    const isCriticalEmergency = 
      textLower.includes('severe chest pain') || 
      textLower.includes('දැඩි පපුවේ කැක්කුම') || 
      textLower.includes('fainted') || 
      textLower.includes('සිහිසුන්') || 
      textLower.includes('cannot breathe') || 
      textLower.includes('හුස්ම ගන්න බැහැ');

    const activeOpds = await OPD.find({ status: 'active' });
    const defaultOpd = activeOpds[0] || null;

    if (isCriticalEmergency) {
      const emergencyMsg = language === 'si'
        ? "අනතුරු ඇඟවීම: ඔබ සඳහන් කළ රෝග ලක්ෂණ හදිසි අනතුරුදායක තත්ත්වයක් පෙන්නුම් කරයි. කරුණාකර සායන සඳහා ප්‍රමාද නොවී වහාම රෝහලේ හදිසි ප්‍රතිකාර ඒකකය (ETU / Emergency Department) වෙත යොමුවන්න. Disclaimer: MediQueue AI provides general guidance and is not a substitute for professional medical care."
        : "CRITICAL ALERT: Your symptoms indicate a severe emergency. Please do not wait for OPD queues; proceed immediately to the Hospital Emergency Treatment Unit (ETU). Disclaimer: MediQueue AI provides general guidance and is not a substitute for professional medical care.";

      let logId = null;
      if (req.user && req.user.userId) {
        const chatLog = await ChatLog.create({
          logId: generateId('LOG'),
          userId: req.user.userId,
          symptomQuery: symptom,
          suggestedOpdId: defaultOpd ? defaultOpd.opdId : null,
          aiResponse: emergencyMsg,
          urgencyLevel: 'CRITICAL_EMERGENCY'
        });
        logId = chatLog.logId;
      }

      return res.status(200).json({
        success: true,
        data: {
          suggestedOpdId: defaultOpd ? defaultOpd.opdId : null,
          opdName: defaultOpd ? defaultOpd.name : 'Emergency Department (ETU)',
          estimatedWaitMinutes: 0,
          aiAnalysis: emergencyMsg,
          urgencyLevel: 'CRITICAL_EMERGENCY',
          logId,
          modelUsed: 'Fast-Rule-Engine-Override'
        },
        message: 'Critical Emergency Detected'
      });
    }

    // ---------------------------------------------------------
    // 2. PATIENT PROFILE CONTEXT
    // ---------------------------------------------------------
    let patientProfileContext = 'Patient Profile: Guest / Anonymous User';
    if (req.user && req.user.userId) {
      const userDoc = await User.findOne({ userId: req.user.userId });
      if (userDoc) {
        patientProfileContext = `
          Patient Profile:
          - Full Name: ${userDoc.firstName} ${userDoc.lastName}
          - Age/DOB: ${userDoc.dob || 'Not provided'}
          - Gender: ${userDoc.gender || 'Not specified'}
          - Medical History/Allergies: ${userDoc.medicalHistory?.join(', ') || 'None reported'}
        `;
      }
    }

    // ---------------------------------------------------------
    // 3. OPD KNOWLEDGE BASE CONTEXT
    // ---------------------------------------------------------
    const opdContext = activeOpds.length > 0 
      ? activeOpds.map(opd => `- ID: "${opd.opdId}" | Name: "${opd.name}" | Department: "${opd.department}"`).join('\n')
      : '- ID: "OPD-GEN01" | Name: "General OPD" | Department: "General Medicine"';

    // ---------------------------------------------------------
    // 4. SYSTEM INSTRUCTIONS (SMART HYBRID CHATBOT + TRIAGE)
    // ---------------------------------------------------------
    const systemInstruction = `
      You are "MediQueue AI", a smart, empathetic, and highly intelligent medical and hospital assistant for the MediQueue platform.

      ${patientProfileContext}

      Available OPDs in our Hospital:
      ${opdContext}

      Capabilities & Instructions:
      1. THOUGHTFUL RESPONSES: You are not just a static classifier. Think deeply like Gemini/ChatGPT to provide informative, natural, and helpful medical guidance, home remedies, general hospital information, or app navigation tips based on the user's input: "${symptom}".
      2. OPD TRIAGE: If the user describes symptoms or medical discomforts, analyze them and smartly match them with the most suitable OPD from the Available OPDs list. If no exact OPD matches or if the query is a general question, default "suggestedOpdId" to null or the General OPD ID.
      3. URGENCY EVALUATION: Determine urgencyLevel as "LOW", "MEDIUM", "HIGH", or "CRITICAL_EMERGENCY" based on clinical assessment.
      4. LANGUAGE: Respond fully and naturally in language code: "${language}" (If 'si', reply in fluent, polite Sinhala).
      5. DISCLAIMER: Always include a short medical disclaimer at the end of health-related responses: "Disclaimer: MediQueue AI provides general guidance and is not a substitute for professional medical care."

      MUST RESPOND STRICTLY IN VALID JSON MATCHING THIS SCHEMA:
      {
        "suggestedOpdId": "string or null (Exact OPD ID if applicable)",
        "urgencyLevel": "LOW | MEDIUM | HIGH | CRITICAL_EMERGENCY",
        "reasoning": "string (Your internal clinical/conversational thought process)",
        "aiAnalysis": "string (Your complete, rich, user-facing conversational response)"
      }
    `;

    // ---------------------------------------------------------
    // 5. GEMINI AI EXECUTION (DYNAMIC MULTI-MODEL FALLBACK)
    // ---------------------------------------------------------
    const apiKey = process.env.GEMINI_API_KEY;
    let parsedAiResponse = null;
    let successModel = '';

    if (apiKey) {
      const genAI = new GoogleGenerativeAI(apiKey);
      
      // Active Google Gemini Endpoints
      const candidateModels = [
        'gemini-3.8-flash',
        'gemini-3.5-flash',
        'gemini-3.1-pro-preview',
        'gemini-2.5-flash',
        'gemini-2.5-pro'
      ];

      for (const modelName of candidateModels) {
        try {
          const model = genAI.getGenerativeModel({ model: modelName });

          // Structured Output Prompt Engineering
          const prompt = `
            ${systemInstruction}
            
            Patient Symptoms: "${symptom}"
            
            Return ONLY a valid JSON object matching the requested schema. Do not include markdown codeblocks or extra text.
          `;

          const result = await model.generateContent(prompt);
          const response = await result.response;
          let jsonText = response.text().trim();
          
          // Clean JSON markdown ticks if present
          if (jsonText.startsWith('```json')) {
            jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
          } else if (jsonText.startsWith('```')) {
            jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '');
          }

          if (jsonText) {
            parsedAiResponse = JSON.parse(jsonText);
            successModel = modelName;
            console.log(`✅ Gemini AI Output generated using model: ${modelName}`);
            break;
          }
        } catch (err) {
          console.warn(`⚠ Model [${modelName}] failed: ${err.message}`);
        }
      }
    }

    // ---------------------------------------------------------
    // 6. DYNAMIC MATCHING & FALLBACK
    // ---------------------------------------------------------
    let finalSuggestedOpd = defaultOpd;

    if (parsedAiResponse && parsedAiResponse.suggestedOpdId) {
      const matchedOpd = activeOpds.find(o => o.opdId === parsedAiResponse.suggestedOpdId);
      if (matchedOpd) {
        finalSuggestedOpd = matchedOpd;
      }
    }

    // Rule engine fallback if AI service was completely unavailable
    if (!parsedAiResponse) {
      if (textLower.includes('headache') || textLower.includes('ඔළුව') || textLower.includes(' dizzy')) {
        finalSuggestedOpd = activeOpds.find(o => o.department.toLowerCase().includes('neuro') || o.department.toLowerCase().includes('general')) || defaultOpd;
      } else if (textLower.includes('chest') || textLower.includes('heart') || textLower.includes('හදවත')) {
        finalSuggestedOpd = activeOpds.find(o => o.department.toLowerCase().includes('cardio')) || defaultOpd;
      }

      parsedAiResponse = {
        suggestedOpdId: finalSuggestedOpd ? finalSuggestedOpd.opdId : 'OPD-GEN01',
        urgencyLevel: 'LOW',
        reasoning: 'Fallback Rule Engine evaluation',
        aiAnalysis: `Based on your symptoms, we suggest visiting the ${finalSuggestedOpd ? finalSuggestedOpd.name : 'General OPD'}. Disclaimer: MediQueue AI provides general guidance and is not a substitute for professional medical care.`
      };
    }

    // ---------------------------------------------------------
    // 7. SAVE CHAT LOG TO DB
    // ---------------------------------------------------------
    let logId = null;
    if (req.user && req.user.userId) {
      const chatLog = await ChatLog.create({
        logId: generateId('LOG'),
        userId: req.user.userId,
        symptomQuery: symptom,
        suggestedOpdId: finalSuggestedOpd ? finalSuggestedOpd.opdId : null,
        aiResponse: parsedAiResponse.aiAnalysis,
        urgencyLevel: parsedAiResponse.urgencyLevel || 'LOW'
      });
      logId = chatLog.logId;
    }

    // ---------------------------------------------------------
    // 8. FINAL JSON RESPONSE
    // ---------------------------------------------------------
    res.status(200).json({
      success: true,
      data: {
        suggestedOpdId: finalSuggestedOpd ? finalSuggestedOpd.opdId : null,
        opdName: finalSuggestedOpd ? finalSuggestedOpd.name : 'General OPD',
        estimatedWaitMinutes: finalSuggestedOpd ? finalSuggestedOpd.avgConsultMinutes : 15,
        aiAnalysis: parsedAiResponse.aiAnalysis,
        urgencyLevel: parsedAiResponse.urgencyLevel || 'LOW',
        reasoning: parsedAiResponse.reasoning || null,
        logId,
        modelUsed: successModel || 'Rule-Engine-Fallback'
      },
      message: 'Suggestion generated successfully'
    });

  } catch (error) {
    console.error('Chatbot Controller Error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get Chat History for logged in user
// @route   GET /api/chatbot/history
// @access  Private
exports.getChatHistory = async (req, res) => {
  try {
    const logs = await ChatLog.find({ userId: req.user.userId }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: logs.length, data: logs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete a specific Chat Log
// @route   DELETE /api/chatbot/history/:logId
// @access  Private
exports.deleteChatLog = async (req, res) => {
  try {
    const { logId } = req.params;
    const log = await ChatLog.findOneAndDelete({ logId, userId: req.user.userId });

    if (!log) {
      return res.status(404).json({ success: false, message: 'Chat log not found' });
    }

    res.status(200).json({ success: true, message: 'Chat log deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Clear ALL Chat History for logged in user
// @route   DELETE /api/chatbot/history
// @access  Private
exports.clearAllHistory = async (req, res) => {
  try {
    await ChatLog.deleteMany({ userId: req.user.userId });
    res.status(200).json({ success: true, message: 'All chat history cleared successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};