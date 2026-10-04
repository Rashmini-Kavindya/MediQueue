const { GoogleGenerativeAI } = require('@google/generative-ai');
const ChatLog = require('../models/ChatLog');
const OPD = require('../models/OPD');
const User = require('../models/User');
const { generateId } = require('../utils/id');

exports.suggestOpd = async (req, res) => {
  try {
    const { symptom, language = 'en' } = req.body;
    
    if (!symptom) {
      return res.status(400).json({ success: false, message: 'Please describe your symptoms' });
    }

    // 1. Patient Profile Context
    let patientProfileContext = 'Patient Profile: Guest / Anonymous User';
    let userId = 'GUEST';

    if (req.user && req.user.userId) {
      userId = req.user.userId;
      const userDoc = await User.findOne({ userId });
      if (userDoc) {
        patientProfileContext = `
          Patient Profile Details:
          - Name: ${userDoc.firstName} ${userDoc.lastName}
          - Age/DOB: ${userDoc.dob || 'Not provided'}
          - Gender: ${userDoc.gender || 'Not specified'}
          - Medical History: ${userDoc.medicalHistory?.join(', ') || 'None'}
        `;
      }
    }

    // 2. Active Hospital OPD List Context
    const activeOpds = await OPD.find({ status: 'active' });
    const opdContext = activeOpds.length > 0 
      ? activeOpds.map(opd => `- Name: ${opd.name} | Department: ${opd.department} | ID: ${opd.opdId}`).join('\n')
      : '- Name: General OPD | Department: General | ID: OPD-GEN01';

    // 3. System Instruction Prompt
    const systemInstruction = `
      You are "MediQueue AI", an expert hospital triage assistant.

      ${patientProfileContext}

      Available OPDs:
      ${opdContext}

      Instructions:
      1. Analyze the symptom: "${symptom}".
      2. Suggest the best matching OPD from the available list.
      3. Explain clearly why based on patient symptoms and profile.
      4. Highlight red-flag emergency symptoms if critical.
      5. Include disclaimer: "Disclaimer: MediQueue AI provides general guidance and is not a substitute for professional medical care."
      6. Respond completely in language code: "${language}" (If 'si', respond strictly in Sinhala).
    `;

    // 4. Gemini Execution with Valid Current Models
    const apiKey = process.env.GEMINI_API_KEY;
    let aiOutputText = '';
    let successModel = '';

    if (apiKey) {
      const genAI = new GoogleGenerativeAI(apiKey);
      
      // Updated active model names
      const candidateModels = [
        'gemini-2.5-flash',
        'gemini-2.5-pro',
        'gemini-3.8-flash'
      ];

      for (const modelName of candidateModels) {
        try {
          const model = genAI.getGenerativeModel({ 
            model: modelName,
            systemInstruction: systemInstruction 
          });

          const result = await model.generateContent(symptom);
          const response = await result.response;
          aiOutputText = response.text();
          
          if (aiOutputText) {
            successModel = modelName;
            console.log(`✅ Gemini AI Output generated using model: ${modelName}`);
            break;
          }
        } catch (err) {
          console.warn(`⚠ Model [${modelName}] failed: ${err.message}`);
        }
      }
    } else {
      console.warn('⚠️ GEMINI_API_KEY is not defined in process.env');
    }

    // 5. Rule-based Fallback
    let suggestedOpd = activeOpds[0];
    const textLower = symptom.toLowerCase();

    if (textLower.includes('headache') || textLower.includes('ඔළුව') || textLower.includes('dizziness') || textLower.includes('කරකැවිල්ල')) {
      suggestedOpd = activeOpds.find(o => 
        o.department.toLowerCase().includes('general') || 
        o.department.toLowerCase().includes('neuro')
      ) || suggestedOpd;
    } else if (textLower.includes('chest') || textLower.includes('heart') || textLower.includes('හදවත')) {
      suggestedOpd = activeOpds.find(o => o.department.toLowerCase().includes('cardio')) || suggestedOpd;
    }

    if (!aiOutputText) {
      aiOutputText = `Based on your symptoms, we suggest visiting the ${suggestedOpd ? suggestedOpd.name : 'General OPD'}. Disclaimer: MediQueue AI provides general guidance and is not a substitute for professional medical care.`;
    }

    // 6. Urgency Evaluation
    let urgencyLevel = 'LOW';
    if (
      aiOutputText.toLowerCase().includes('emergency') ||
      aiOutputText.toLowerCase().includes('critical') ||
      aiOutputText.toLowerCase().includes('අත්‍යවශ්‍ය')
    ) {
      urgencyLevel = 'CRITICAL_EMERGENCY';
    } else if (aiOutputText.toLowerCase().includes('urgent') || aiOutputText.toLowerCase().includes('ඉක්මනින්')) {
      urgencyLevel = 'MEDIUM';
    }

    // 7. Save Chat Log
    let logId = null;
    if (req.user) {
      const chatLog = await ChatLog.create({
        logId: generateId('LOG'),
        userId: req.user.userId,
        symptomQuery: symptom,
        suggestedOpdId: suggestedOpd ? suggestedOpd.opdId : null,
        aiResponse: aiOutputText,
        urgencyLevel
      });
      logId = chatLog.logId;
    }

    res.status(200).json({
      success: true,
      data: {
        suggestedOpdId: suggestedOpd ? suggestedOpd.opdId : null,
        opdName: suggestedOpd ? suggestedOpd.name : 'General OPD',
        estimatedWaitMinutes: suggestedOpd ? suggestedOpd.avgConsultMinutes : 15,
        aiAnalysis: aiOutputText,
        urgencyLevel,
        logId,
        modelUsed: successModel || 'Rule-Engine-Fallback'
      },
      message: 'Suggestion generated'
    });

  } catch (error) {
    console.error('Chatbot Controller Error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};