const Token = require('../models/Token');
const { notifyTurnNear, notifyTurnCalled } = require('./notificationService');

const emitQueueUpdate = async (io, opdId, token) => {
  try {
    if (!io || !opdId || !token) {
      return;
    }

    const queueTokens = await Token.find({
      opdId,
      queueDate: token.queueDate,
      status: { $in: ['waiting', 'called', 'hold', 'in-consultation'] }
    })
      .sort({ tokenSequence: 1 })
      .select('tokenId tokenNo tokenSequence patientId userId status opdId queueDate');

    // TODO: Before final integration/demo, do not expose patientId/userId
    // through the public queue:update socket payload.

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

    // 1. "Your turn" alert when a token has just been called
    if (token.status === 'called') {
      const targetUserId = token.userId || token.patientId;
      if (targetUserId) {
        try {
          await notifyTurnCalled({
            userId: targetUserId,
            tokenId: token.tokenId,
            tokenNo: token.tokenNo,
            room: token.room || token.roomName
          });
        } catch (err) {
          console.error('Turn-called notification error:', err.message);
        }
      }
    }

    // 2. "Turn near" alert - uses each user's own threshold, sent once per token
    const waitingTokens = queueTokens.filter((t) => t.status === 'waiting');

    for (let i = 0; i < waitingTokens.length; i++) {
      const waiting = waitingTokens[i];
      const targetUserId = waiting.userId || waiting.patientId;
      if (!targetUserId) continue;

      try {
        await notifyTurnNear({
          userId: targetUserId,
          tokenId: waiting.tokenId,
          tokenNo: waiting.tokenNo,
          patientsAhead: i
        });
      } catch (err) {
        console.error('Turn-near notification error:', err.message);
      }
    }
  } catch (error) {
    console.error('Queue update error:', error.message);
  }
};

module.exports = { emitQueueUpdate };