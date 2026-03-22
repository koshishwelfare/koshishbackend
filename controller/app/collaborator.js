import CollaboratorModel from '../../models/collaborator/collaboratorSchema.js';

const listCollaboratorsPublic = async (req, res) => {
  try {
    const {
      q = '',
      isActive,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 10
    } = req.query;

    const filter = {};
    const trimmedQ = String(q || '').trim();

    if (trimmedQ) {
      const regex = new RegExp(trimmedQ, 'i');
      filter.$or = [{ name: regex }, { about: regex }, { speciality: regex }];
    }

    if (isActive === 'true') filter.isActive = true;
    if (isActive === 'false') filter.isActive = false;

    const safePage = Math.max(Number(page) || 1, 1);
    const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 100);
    const skip = (safePage - 1) * safeLimit;

    const allowedSortFields = new Set(['createdAt', 'name', 'isActive']);
    const safeSortBy = allowedSortFields.has(sortBy) ? sortBy : 'createdAt';
    const safeSortOrder = String(sortOrder).toLowerCase() === 'asc' ? 1 : -1;

    const [data, total] = await Promise.all([
      CollaboratorModel.find(filter)
        .sort({ [safeSortBy]: safeSortOrder })
        .skip(skip)
        .limit(safeLimit),
      CollaboratorModel.countDocuments(filter)
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
      message: 'Collaborator organizations found'
    });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

const getCollaboratorPublicById = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await CollaboratorModel.findById(id);

    if (!data) {
      return res.json({ success: false, message: 'Collaborator organization not found' });
    }

    return res.json({ success: true, data, message: 'Collaborator organization found' });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

export { listCollaboratorsPublic, getCollaboratorPublicById };
