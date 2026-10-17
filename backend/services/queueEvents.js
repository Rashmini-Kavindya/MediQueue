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
          'in-consultation',
          'completed',
          'skipped'
        ]
      }
    })
      .sort({ tokenSequence: 1 })
      .select(
        'tokenId tokenNo tokenSequence patientId userId status opdId queueDate'
      );
  const publicQueue = queueTokens.map(t => ({
      tokenNo: t.tokenNo,
      tokenSequence: t.tokenSequence,
      status: t.status,
      opdId: t.opdId,
      queueDate: t.queueDate
    }));

    io.to(`opd:${opdId}`).emit('queue:update', {
      success: true,
      data: {
        opdId,
        queueDate: token.queueDate,
        updatedToken: {
          tokenNo: token.tokenNo,
          status: token.status
        },
        queue: publicQueue
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
