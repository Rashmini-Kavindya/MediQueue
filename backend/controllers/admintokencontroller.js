const Token = require('../models/Token');
const OPD = require('../models/OPD');
const User = require('../models/User');

const ACTIVE_STATUSES = ['waiting', 'called', 'hold', 'in-consultation'];
const ALL_STATUSES = ['waiting', 'called', 'hold', 'skipped', 'in-consultation', 'completed', 'cancelled'];

// Same date format bookToken uses for queueDate
const todayStr = () => new Date().toISOString().split('T')[0];
const resolveDate = (value) => (/^\d{4}-\d{2}-\d{2}$/.test(value || '') ? value : todayStr());

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const emptyCounts = () => ALL_STATUSES.reduce((acc, s) => ({ ...acc, [s]: 0 }), {});

const displayName = (user) => {
  if (!user) return null;
  return user.name || [user.firstName, user.lastName].filter(Boolean).join(' ') || null;
};

// Adds patientName to each token (looked up in one query)
const attachPatientNames = async (tokens) => {
  const ids = [...new Set(tokens.flatMap((t) => [t.patientId, t.userId]).filter(Boolean))];
  if (ids.length === 0) return tokens;

  const users = await User.find({ $or: [{ patientId: { $in: ids } }, { userId: { $in: ids } }] })
    .select('userId patientId name firstName lastName')
    .lean();

  const byKey = new Map();
  users.forEach((u) => {
    if (u.patientId) byKey.set(u.patientId, u);
  });
  users.forEach((u) => {
    if (u.userId && !byKey.has(u.userId)) byKey.set(u.userId, u);
  });

  return tokens.map((t) => ({
    ...t,
    patientName: displayName(byKey.get(t.patientId) || byKey.get(t.userId))
  }));
};

// GET /api/admin/tokens/overview?queueDate=YYYY-MM-DD
// One card per OPD: counts per status, who is being served, who is next.
exports.getOverview = async (req, res) => {
  try {
    const queueDate = resolveDate(req.query.queueDate);

    const [opds, countRows, servingRows, nextRows] = await Promise.all([
      OPD.find({}).select('opdId name roomId status').lean(),
      Token.aggregate([
        { $match: { queueDate } },
        { $group: { _id: { opdId: '$opdId', status: '$status' }, count: { $sum: 1 } } }
      ]),
      Token.aggregate([
        { $match: { queueDate, status: { $in: ['called', 'in-consultation'] } } },
        { $sort: { tokenSequence: -1 } },
        { $group: { _id: '$opdId', tokenNo: { $first: '$tokenNo' }, status: { $first: '$status' } } }
      ]),
      Token.aggregate([
        { $match: { queueDate, status: 'waiting' } },
        { $sort: { tokenSequence: 1 } },
        { $group: { _id: '$opdId', tokenNo: { $first: '$tokenNo' } } }
      ])
    ]);

    const byOpd = new Map();
    const ensure = (opdId, meta = {}) => {
      if (!byOpd.has(opdId)) {
        byOpd.set(opdId, {
          opdId,
          name: meta.name || opdId,
          roomId: meta.roomId || null,
          status: meta.status || null,
          counts: emptyCounts(),
          total: 0,
          active: 0,
          serving: null,
          next: null
        });
      }
      return byOpd.get(opdId);
    };

    opds.forEach((o) => ensure(o.opdId, o));

    countRows.forEach((r) => {
      const row = ensure(r._id.opdId);
      row.counts[r._id.status] = (row.counts[r._id.status] || 0) + r.count;
      row.total += r.count;
      if (ACTIVE_STATUSES.includes(r._id.status)) row.active += r.count;
    });

    servingRows.forEach((r) => {
      ensure(r._id).serving = { tokenNo: r.tokenNo, status: r.status };
    });
    nextRows.forEach((r) => {
      ensure(r._id).next = { tokenNo: r.tokenNo };
    });

    const list = [...byOpd.values()].sort((a, b) => String(a.name).localeCompare(String(b.name)));

    const totals = list.reduce(
      (acc, o) => {
        acc.total += o.total;
        acc.active += o.active;
        ALL_STATUSES.forEach((s) => {
          acc.counts[s] += o.counts[s] || 0;
        });
        return acc;
      },
      { total: 0, active: 0, counts: emptyCounts() }
    );

    res.status(200).json({ success: true, data: { queueDate, totals, opds: list } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/admin/tokens?queueDate=&opdId=&status=&search=&page=&limit=
// status: any token status, or "active" (waiting + called + hold + in-consultation)
// Always in queue order (tokenSequence ascending).
exports.listTokens = async (req, res) => {
  try {
    const { opdId, status, search } = req.query;
    const queueDate = resolveDate(req.query.queueDate);
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 30, 1), 100);

    const base = { queueDate };
    if (opdId) base.opdId = opdId;

    const filter = { ...base };
    if (status === 'active') filter.status = { $in: ACTIVE_STATUSES };
    else if (ALL_STATUSES.includes(status)) filter.status = status;

    if (search && search.trim()) {
      const rx = new RegExp(escapeRegex(search.trim()), 'i');

      // Match by patient name too
      const matchedUsers = await User.find({
        $or: [{ name: rx }, { firstName: rx }, { lastName: rx }]
      })
        .setOptions({ strictQuery: false })
        .select('userId patientId')
        .limit(100)
        .lean();
      const ids = matchedUsers.flatMap((u) => [u.patientId, u.userId]).filter(Boolean);

      filter.$or = [
        { tokenNo: rx },
        { tokenId: rx },
        { patientId: rx },
        { userId: rx },
        { trackingCode: rx },
        ...(ids.length ? [{ patientId: { $in: ids } }] : [])
      ];
    }

    const [tokens, total, countRows] = await Promise.all([
      Token.find(filter)
        .sort({ tokenSequence: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Token.countDocuments(filter),
      Token.aggregate([{ $match: base }, { $group: { _id: '$status', count: { $sum: 1 } } }])
    ]);

    const statusCounts = emptyCounts();
    countRows.forEach((r) => {
      statusCounts[r._id] = r.count;
    });
    statusCounts.active = ACTIVE_STATUSES.reduce((sum, s) => sum + statusCounts[s], 0);
    statusCounts.all = ALL_STATUSES.reduce((sum, s) => sum + statusCounts[s], 0);

    res.status(200).json({
      success: true,
      data: await attachPatientNames(tokens),
      statusCounts,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/admin/tokens/:tokenId
exports.getToken = async (req, res) => {
  try {
    const token = await Token.findOne({ tokenId: req.params.tokenId }).lean();

    if (!token) {
      return res.status(404).json({ success: false, message: 'Token not found' });
    }

    const isActive = ACTIVE_STATUSES.includes(token.status);

    const [opd, patientsAhead, [withName]] = await Promise.all([
      OPD.findOne({ opdId: token.opdId }).select('opdId name').lean(),
      isActive
        ? Token.countDocuments({
            opdId: token.opdId,
            queueDate: token.queueDate,
            status: { $in: ACTIVE_STATUSES },
            tokenSequence: { $lt: token.tokenSequence }
          })
        : Promise.resolve(null),
      attachPatientNames([token])
    ]);

    const minutesBetween = (from, to) =>
      from && to ? Math.max(0, (new Date(to) - new Date(from)) / 60000) : null;

    const bookedAt = token.bookedAt || token.createdAt;

    res.status(200).json({
      success: true,
      data: {
        ...withName,
        bookedAt,
        opdName: opd ? opd.name : null,
        patientsAhead,
        metrics: {
          // Time waited: until called, or until now if still waiting
          waitMinutes: minutesBetween(bookedAt, token.calledAt || (token.status === 'waiting' ? new Date() : null)),
          consultationMinutes: minutesBetween(token.consultationStartedAt, token.completedAt)
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};