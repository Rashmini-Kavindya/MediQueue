const ChatLog = require('../models/ChatLog');
const OPD = require('../models/OPD');
const User = require('../models/User');
const { generateId } = require('../utils/id');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const VALID_URGENCY = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL_EMERGENCY'];

// ---------------------------------------------------------
// AI PROVIDERS (OpenAI-compatible chat APIs, tried in order)
// Env: GROQ_API_KEY (primary), MISTRAL_API_KEY (optional fallback)
// Optional overrides: GROQ_MODEL, MISTRAL_MODEL
// ---------------------------------------------------------
const getProviders = () => {
  const providers = [];

  if (process.env.GROQ_API_KEY) {
    providers.push({
      name: 'groq',
      url: 'https://api.groq.com/openai/v1/chat/completions',
      apiKey: process.env.GROQ_API_KEY,
      // Tried in order; a 404 (model missing / no access for this key) moves on to the next one
      models: [...new Set([
        process.env.GROQ_MODEL,
        'llama-3.3-70b-versatile',
        'openai/gpt-oss-120b',
        'llama-3.1-8b-instant'
      ].filter(Boolean))]
    });
  }

  if (process.env.MISTRAL_API_KEY) {
    providers.push({
      name: 'mistral',
      url: 'https://api.mistral.ai/v1/chat/completions',
      apiKey: process.env.MISTRAL_API_KEY,
      models: [process.env.MISTRAL_MODEL || 'mistral-small-latest']
    });
  }

  return providers;
};

// Calls one provider/model and returns the parsed JSON object. Throws an error with .status on failure.
const callChatApi = async (provider, modelName, systemInstruction, symptom) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch(provider.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${provider.apiKey}`
      },
      body: JSON.stringify({
        model: modelName,
        temperature: 0.4,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemInstruction },
          {
            role: 'user',
            content: `Patient Symptoms: "${symptom}"\n\nReturn ONLY a valid JSON object matching the requested schema. Do not include markdown codeblocks or extra text.`
          }
        ]
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      const body = await response.text();
      const err = new Error(`${response.status} ${body.slice(0, 200)}`);
      err.status = response.status;
      throw err;
    }

    const data = await response.json();
    let jsonText = (data.choices?.[0]?.message?.content || '').trim();

    // Clean JSON markdown ticks if present
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    if (!jsonText) throw new Error('Empty AI response');
    return JSON.parse(jsonText);
  } finally {
    clearTimeout(timeoutId);
  }
};

// @desc    Suggest OPD using Patient Profile & AI (Structured JSON + Fast Emergency Override)
// @route   POST /api/chatbot/suggest
// @access  Authenticated / Public
exports.suggestOpd = async (req, res) => {
  try {
    const { symptom, language = 'en' } = req.body;

    // Groups all messages of one chat session together (sent by the app)
    const conversationId = req.body.conversationId
      ? String(req.body.conversationId).trim().slice(0, 60)
      : undefined;

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
          conversationId,
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
          conversationId: conversationId || null,
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
    // 5. AI EXECUTION (GROQ -> MISTRAL FALLBACK, RETRY ON 5xx)
    // ---------------------------------------------------------
    let parsedAiResponse = null;
    let successModel = '';
    const MAX_ATTEMPTS = 2;

    const providers = getProviders();
    if (providers.length === 0) {
      console.warn('⚠ No AI provider key set (GROQ_API_KEY / MISTRAL_API_KEY). Using rule engine.');
    }

    for (const provider of providers) {
      for (const modelName of provider.models) {
        for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
          try {
            parsedAiResponse = await callChatApi(provider, modelName, systemInstruction, symptom);
            successModel = `${provider.name}:${modelName}`;
            console.log(`✅ AI Output generated using ${successModel} (attempt ${attempt})`);
            break;
          } catch (err) {
            console.warn(`⚠ [${provider.name}:${modelName}] attempt ${attempt} failed: ${err.message}`);
            // Retry the same model only for temporary server errors / timeouts
            const retryable = err.status === 500 || err.status === 502 || err.status === 503 || err.name === 'AbortError';
            if (!retryable) break; // 401 / 404 / 429 / bad JSON -> next model/provider
            if (attempt < MAX_ATTEMPTS) await sleep(attempt * 1000);
          }
        }
        if (parsedAiResponse) break;
      }
      if (parsedAiResponse) break;
    }

    // Make sure urgencyLevel is always one of the allowed values (matches ChatLog enum)
    if (parsedAiResponse && !VALID_URGENCY.includes(parsedAiResponse.urgencyLevel)) {
      parsedAiResponse.urgencyLevel = 'LOW';
    }

    // Make sure aiAnalysis is always a non-empty string (ChatLog requires aiResponse)
    if (parsedAiResponse && (typeof parsedAiResponse.aiAnalysis !== 'string' || !parsedAiResponse.aiAnalysis.trim())) {
      parsedAiResponse = null;
      successModel = '';
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
        conversationId,
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
        conversationId: conversationId || null,
        modelUsed: successModel || 'Rule-Engine-Fallback'
      },
      message: 'Suggestion generated successfully'
    });

  } catch (error) {
    console.error('Chatbot Controller Error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get Chat History for logged in user (one row per message; the app groups them by conversationId)
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

// @desc    Delete a whole conversation (all its messages)
// @route   DELETE /api/chatbot/history/:logId
//          :logId = conversationId (or the logId of an old log that has no conversationId)
// @access  Private
exports.deleteChatLog = async (req, res) => {
  try {
    const key = req.params.logId;
    const result = await ChatLog.deleteMany({
      userId: req.user.userId,
      $or: [{ conversationId: key }, { logId: key }]
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: 'Chat log not found' });
    }

    res.status(200).json({ success: true, message: 'Chat deleted successfully' });
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

// @desc    Rename a whole conversation
// @route   PATCH /api/chatbot/history/:logId
//          :logId = conversationId (or the logId of an old log that has no conversationId)
// @access  Private
exports.renameChatLog = async (req, res) => {
  try {
    const title = (req.body.title || '').trim();
    if (!title) {
      return res.status(400).json({ success: false, message: 'Title is required' });
    }

    const key = req.params.logId;
    const result = await ChatLog.updateMany(
      { userId: req.user.userId, $or: [{ conversationId: key }, { logId: key }] },
      { title: title.slice(0, 80) }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ success: false, message: 'Chat not found' });
    }

    res.status(200).json({ success: true, message: 'Chat renamed successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to rename chat' });
  }
};