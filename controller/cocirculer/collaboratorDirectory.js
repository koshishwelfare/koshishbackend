import CollaboratorModel from '../../models/collaborator/collaboratorSchema.js';
import validator from 'validator';
import { cloudinaryUploadImage } from '../../middleware/cloudimage/cloudinary.js';

const listCollaboratorsForConsole = async (req, res) => {
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
      filter.$or = [{ name: regex }, { speciality: regex }, { about: regex }];
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
      message: 'Collaborator listing found'
    });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

const getCollaboratorForConsoleById = async (req, res) => {
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

const createCollaboratorForConsole = async (req, res) => {
  try {
    const {
      name,
      email = '',
      website = '',
      speciality = 'Organization Partner',
      about = '',
      isActive = true
    } = req.body;

    if (!name) {
      return res.json({ success: false, message: 'name is required' });
    }

    const trimmedName = String(name).trim();
    if (!trimmedName) {
      return res.json({ success: false, message: 'name is required' });
    }

    let normalizedEmail = '';
    if (String(email || '').trim()) {
      normalizedEmail = String(email).trim().toLowerCase();
      if (!validator.isEmail(normalizedEmail)) {
        return res.json({ success: false, message: 'Please provide a valid email address' });
      }
      const existingByEmail = await CollaboratorModel.findOne({ email: normalizedEmail });
      if (existingByEmail) {
        return res.json({ success: false, message: 'Collaborator already exists with this email' });
      }
    }

    let image = '';
    if (req.file) {
      const imageUpload = await cloudinaryUploadImage(req.file);
      image = imageUpload?.secure_url || '';
    }

    const created = await CollaboratorModel.create({
      name: trimmedName,
      email: normalizedEmail,
      image,
      website: String(website || '').trim(),
      speciality: String(speciality || '').trim() || 'Organization Partner',
      about: String(about || '').trim(),
      isActive: String(isActive) === 'false' ? false : Boolean(isActive)
    });

    return res.json({ success: true, data: created, message: 'Collaborator created successfully' });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

const updateCollaboratorForConsole = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = {};

    const editableFields = ['name', 'email', 'website', 'speciality', 'about', 'isActive'];
    editableFields.forEach((field) => {
      if (req.body[field] === undefined) {
        return;
      }
      if (field === 'isActive') {
        updates.isActive = String(req.body.isActive) === 'true';
        return;
      }
      updates[field] = typeof req.body[field] === 'string'
        ? req.body[field].trim()
        : req.body[field];
    });

    if (updates.name !== undefined && !String(updates.name).trim()) {
      return res.json({ success: false, message: 'name cannot be empty' });
    }

    if (updates.email !== undefined) {
      if (!updates.email) {
        updates.email = '';
      } else {
        const normalizedEmail = String(updates.email).toLowerCase();
        if (!validator.isEmail(normalizedEmail)) {
          return res.json({ success: false, message: 'Please provide a valid email address' });
        }
        const emailConflict = await CollaboratorModel.findOne({
          email: normalizedEmail,
          _id: { $ne: id }
        });
        if (emailConflict) {
          return res.json({ success: false, message: 'Another collaborator already uses this email' });
        }
        updates.email = normalizedEmail;
      }
    }

    if (req.file) {
      const imageUpload = await cloudinaryUploadImage(req.file);
      if (imageUpload?.secure_url) {
        updates.image = imageUpload.secure_url;
      }
    }

    if (!Object.keys(updates).length) {
      return res.json({ success: false, message: 'No fields provided to update' });
    }

    const updated = await CollaboratorModel.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true
    });

    if (!updated) {
      return res.json({ success: false, message: 'Collaborator organization not found' });
    }

    return res.json({ success: true, data: updated, message: 'Collaborator updated successfully' });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

export {
  listCollaboratorsForConsole,
  getCollaboratorForConsoleById,
  createCollaboratorForConsole,
  updateCollaboratorForConsole
};
