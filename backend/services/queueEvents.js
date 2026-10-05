const Token = require('../models/Token');
const { createQueueNotification } = require('./notificationService');

const emitQueueUpdate = async (io, opdId, token) => {
  try {
    if (!io || !opdId || !token) {
      return;
    }

    
    const queueTokens = await Token.find({
      opdId,
      queueDate: token.queueDate,
      status: {
        $in: [
          'waiting',
          'called',
          'hold',
          'in-consultation'
        ]
      }
    })
      .sort({ tokenSequence: 1 })
      .select(
        'tokenId tokenNo tokenSequence patientId userId status opdId queueDate'
      );

    
    io.to(`opd:${opdId}`).emit('queue:update', {
      success: true,
      data: {
        opdId,
        queueDate: token.queueDate,
        updatedToken: {
          tokenId: token.tokenId,
          tokenNo: token.tokenNo,
          status: token.status
        },
        queue: queueTokens
      }
    });

    console.log(`📢 Queue update emitted for OPD: ${opdId}`);

    
    const waitingTokens = queueTokens.filter(t => t.status === 'waiting');

    for (let i = 0; i < waitingTokens.length; i++) {
      const currentWaitingToken = waitingTokens[i];
      const patientsAhead = i; 

      
      if (patientsAhead <= 5) {
        await createQueueNotification({
          userId: currentWaitingToken.userId || currentWaitingToken.patientId,
          tokenId: currentWaitingToken.tokenId,
          type: 'near',
          message: `Your turn is near! Only ${patientsAhead} patient(s) ahead of you.`
        });
      }
    }

  } catch (error) {
    console.error('Queue update error:', error.message);
  }
};

module.exports = {
  emitQueueUpdate
};