import CocicularModel from '../../models/Cocirculer/cocerculerProfile.js';

const listCocircularPublic = async (req, res) => {
  try {
    const {
      q = '',
      isactive,
      sortBy = 'date',
      sortOrder = 'desc',
      page = 1,
      limit = 10
    } = req.query;

    const filter = {};
    const trimmedQ = String(q || '').trim();

    if (trimmedQ) {
      const regex = new RegExp(trimmedQ, 'i');
      filter.$or = [
        { name: regex },
        { email: regex },
        { speciality: regex },
        { degree: regex }
      ];
    }

    if (isactive === 'true') filter.isactive = true;
    if (isactive === 'false') filter.isactive = false;

    const safePage = Math.max(Number(page) || 1, 1);
    const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 100);
    const skip = (safePage - 1) * safeLimit;

    const allowedSortFields = new Set(['date', 'name', 'email', 'speciality', 'isactive']);
    const safeSortBy = allowedSortFields.has(sortBy) ? sortBy : 'date';
    const safeSortOrder = String(sortOrder).toLowerCase() === 'asc' ? 1 : -1;

    const [data, total] = await Promise.all([
      CocicularModel.find(filter, {
        password: 0
      })
        .sort({ [safeSortBy]: safeSortOrder })
        .skip(skip)
        .limit(safeLimit),
      CocicularModel.countDocuments(filter)
    ]);

    return res.json({
      success: true,
      data,
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.max(Math.ceil(total / safeLimit), 1)
      },
      message: 'Co-curricular users found'
    });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

const getCocircularPublicById = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await CocicularModel.findById(id, { password: 0 });

    if (!data) {
      return res.json({ success: false, message: 'Co-curricular profile not found' });
    }

    return res.json({ success: true, data, message: 'Co-curricular profile found' });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

export { listCocircularPublic, getCocircularPublicById };
